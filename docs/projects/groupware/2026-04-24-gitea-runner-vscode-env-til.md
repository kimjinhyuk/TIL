# TIL: Self-hosted Gitea Runner 가 VSCode 환경변수를 물고 늘어지는 함정

> 본 글은 팀 프로젝트 운영 중 마주친 삽질 기록을 일반화해 정리한 것입니다.

## 증상

어느 날 잘 돌던 자동 배포가 `git fetch` 단계에서 계속 실패하기 시작했다.

```
remote: Unauthorized
fatal: Authentication failed for 'https://git.internal/ORG/repo'
```

CI 설정은 손댄 적 없고 코드 push 만 한 건데 왜 갑자기 인증이 안 되나 싶었다. 브라우저로 Git 포털에 토큰 로그인은 멀쩡히 된다. 토큰도 유효. 그런데 runner 에서만 계속 `Unauthorized`.

## 추적

먼저 runner 프로세스가 어떤 환경에서 떠 있는지 들여다봤다.

```bash
$ pgrep -af act_runner
23451 /home/ci/gitea-runner/act_runner daemon

$ cat /proc/23451/environ | tr '\0' '\n' | grep -i vscode
VSCODE_GIT_IPC_HANDLE=/run/user/1000/vscode-git-abc123.sock
VSCODE_GIT_ASKPASS_NODE=/home/ci/.vscode-server/.../node
VSCODE_GIT_ASKPASS_MAIN=/home/ci/.vscode-server/.../extensions/git/dist/askpass-main.js
GIT_ASKPASS=/home/ci/.vscode-server/.../extensions/git/dist/askpass.sh
```

범인이 보였다.

## 원인

며칠 전 서버에 **VSCode Remote 로 접속한 상태에서 `act_runner daemon` 을 수동 기동**했었다. VSCode Remote 는 접속 세션마다 자체 `VSCODE_GIT_IPC_HANDLE` 소켓을 띄우고 `GIT_ASKPASS` 를 자기 쪽으로 바꿔둔다. 이 환경변수가 그대로 runner 의 부모 쉘에 있었고, daemon 화되면서 **프로세스 env 에 영구 박제**됐다.

그 후 VSCode 세션을 끊었지만 소켓(`/run/user/1000/vscode-git-*.sock`) 은 당연히 사라졌다. 하지만 runner 는 여전히 죽은 소켓을 가리키는 env 를 들고 있어서, `git fetch` 가 뜰 때마다:

1. git 이 credential 이 필요함 → `GIT_ASKPASS` 스크립트 실행
2. 스크립트가 죽은 소켓으로 IPC 시도 → `ECONNREFUSED`
3. 빈 credential 반환
4. 서버가 `Unauthorized` 로 응답

이 체인이 매번 반복됐다. CI 설정은 멀쩡했다 — **프로세스 env 가 오염된 거였다**.

## 수정

진짜 근본 원인은 "VSCode 세션에서 daemon 을 기동하면 안 됨" 이지만, 당장 배포를 돌려야 하니 워크플로우 step 에서 방어하는 한 줄을 먼저 넣었다.

```yaml
- name: Pull latest code
  env:
    GIT_TOKEN: ${{ secrets.GIT_TOKEN }}
  run: |
    unset GIT_ASKPASS \
          VSCODE_GIT_ASKPASS_NODE \
          VSCODE_GIT_ASKPASS_EXTRA_ARGS \
          VSCODE_GIT_ASKPASS_MAIN \
          VSCODE_GIT_IPC_HANDLE

    git -c http.extraHeader="Authorization: Bearer ${GIT_TOKEN}" \
      fetch origin main
    git reset --hard origin/main
```

두 가지가 핵심:

- `unset` 으로 VSCode askpass 체인 끊기
- askpass 에 기대지 않고 **job 마다 주입되는 토큰으로 Authorization 헤더 직접** 설정

## 교훈

1. **Daemon 은 systemd 로** — 수동 기동은 쉘 env 가 그대로 박제된다. systemd 서비스로 등록하면 `Environment=` 에 명시한 것만 들어간다. 재부팅 후에도 깨끗한 env 로 재기동.
2. **VSCode Remote 세션에서 서비스 시작 금지** — askpass 환경변수가 딸려 들어간다. 같은 함정은 GPG agent, SSH agent 에서도 재현될 수 있다.
3. **"갑자기" 나타난 증상은 프로세스 env 부터 의심** — 코드·설정은 안 바뀌었는데 동작이 달라지면, 프로세스가 기동 당시의 쉘 상태를 물고 있는 경우가 흔하다. `cat /proc/<pid>/environ | tr '\0' '\n'` 한 번이면 드러난다.

재발 방지로 systemd user service 로 전환하는 건 TODO 에 올려두었다.
