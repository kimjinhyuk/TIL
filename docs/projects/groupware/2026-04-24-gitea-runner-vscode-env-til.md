# Self-hosted Gitea Runner 가 VSCode 환경변수를 물고 늘어지는 함정

> 본 글은 팀 프로젝트 운영 중 마주친 삽질 기록을 일반화해 정리한 것입니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #f85149; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2a0f0f, #1a0606); padding: 14px 20px;">
    <span style="color: #f85149; font-weight: 700; font-size: 15px;">증상 &rarr; 원인 &rarr; 해결</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color: #f85149; font-weight: 700;">증상&nbsp;&nbsp;</span>CI 설정/코드 변경 없이 <code>git fetch</code> 가 갑자기 매번 <code>Unauthorized</code></div>
    <div><span style="color: #f0883e; font-weight: 700;">원인&nbsp;&nbsp;</span>VSCode Remote 세션에서 <code>act_runner daemon</code> 수동 기동 &rarr; <strong>VSCODE_GIT_* 환경변수가 daemon 프로세스에 박제</strong></div>
    <div><span style="color: #3fb950; font-weight: 700;">해결&nbsp;&nbsp;</span>워크플로우 step 에서 <code>unset</code> + 토큰 헤더로 우회. 근본 해결은 <strong>systemd user service</strong> 로 전환</div>
  </div>
</div></div>

## 증상

어느 날 잘 돌던 자동 배포가 `git fetch` 단계에서 계속 실패하기 시작했다.

```
remote: Unauthorized
fatal: Authentication failed for 'https://git.internal/ORG/repo'
```

CI 설정은 손댄 적 없고 코드 push 만 한 건데 왜 갑자기 인증이 안 되나 싶었다. 브라우저로 Git 포털에 토큰 로그인은 멀쩡히 된다. 토큰도 유효. 그런데 runner 에서만 계속 `Unauthorized`.

## 추적: 프로세스가 들고 있는 env 보기

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

## 원인 — "죽은 소켓" 체인이 매번 401 을 만들어낸다

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="width: 100%; max-width: 560px; border: 2px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 10px 14px; text-align: center;">
      <span style="color: #f0883e; font-weight: 700;">&#9312; 며칠 전, VSCode Remote 세션에서 daemon 수동 기동</span>
    </div>
    <div style="background: #0d1117; padding: 12px 16px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      세션의 <code>VSCODE_GIT_IPC_HANDLE</code>, <code>GIT_ASKPASS</code> 가 부모 쉘에 살아 있었고, daemon 화되면서 그대로 <strong style="color:#f0883e;">프로세스 env 에 영구 박제</strong>.
    </div>
  </div>
  <div style="color: #484f58; font-size: 22px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 560px; border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c0f33; padding: 10px 14px; text-align: center;">
      <span style="color: #d2a8ff; font-weight: 600;">&#9313; VSCode 세션 종료</span>
    </div>
    <div style="background: #0d1117; padding: 12px 16px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      소켓 <code>/run/user/1000/vscode-git-*.sock</code> 은 사라짐. 하지만 daemon 의 env 는 여전히 그 경로를 가리킴 &rarr; <strong style="color:#d2a8ff;">죽은 소켓 참조</strong>.
    </div>
  </div>
  <div style="color: #484f58; font-size: 22px;">&#x25BC;</div>

  <div style="width: 100%; border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2a0f0f, #1a0606); padding: 10px 14px; text-align: center;">
      <span style="color: #f85149; font-weight: 700;">&#9314; git fetch 가 뜰 때마다 반복되는 4단계</span>
    </div>
    <div style="background: #0d1117; padding: 14px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
        <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px 8px; background: #161b22; text-align: center;">
          <div style="font-size: 10px; color: #8b949e; letter-spacing: 0.5px;">STEP 1</div>
          <div style="color: #e6edf3; font-size: 13px; font-weight: 600; margin-top: 2px;">credential 필요</div>
          <div style="color: #8b949e; font-size: 11px; margin-top: 4px;"><code>GIT_ASKPASS</code> 실행</div>
        </div>
        <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px 8px; background: #161b22; text-align: center;">
          <div style="font-size: 10px; color: #8b949e; letter-spacing: 0.5px;">STEP 2</div>
          <div style="color: #e6edf3; font-size: 13px; font-weight: 600; margin-top: 2px;">IPC 시도</div>
          <div style="color: #8b949e; font-size: 11px; margin-top: 4px;">죽은 소켓 &rarr; <span style="color:#f85149;">ECONNREFUSED</span></div>
        </div>
        <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px 8px; background: #161b22; text-align: center;">
          <div style="font-size: 10px; color: #8b949e; letter-spacing: 0.5px;">STEP 3</div>
          <div style="color: #e6edf3; font-size: 13px; font-weight: 600; margin-top: 2px;">빈 credential</div>
          <div style="color: #8b949e; font-size: 11px; margin-top: 4px;">스크립트가 손 들음</div>
        </div>
        <div style="border: 1px solid #5a1c1c; border-radius: 8px; padding: 10px 8px; background: #2a0f0f; text-align: center;">
          <div style="font-size: 10px; color: #f85149; letter-spacing: 0.5px;">STEP 4</div>
          <div style="color: #f85149; font-size: 13px; font-weight: 700; margin-top: 2px;">401 Unauthorized</div>
          <div style="color: #8b949e; font-size: 11px; margin-top: 4px;">서버 응답</div>
        </div>
      </div>
    </div>
  </div>

</div></div>

CI 설정은 멀쩡했다 — **프로세스 env 가 오염된 거였다**.

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

핵심 두 가지:

- `unset` 으로 VSCode askpass 체인 끊기
- askpass 에 기대지 않고 **job 마다 주입되는 토큰으로 Authorization 헤더 직접** 설정

## 교훈

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">1. Daemon 은 systemd 로</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      수동 기동은 쉘 env 가 박제된다. systemd 서비스로 등록하면 <code>Environment=</code> 에 명시한 것만 들어가고, 재부팅 후에도 깨끗한 env 로 재기동.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">2. Remote 세션에서 서비스 시작 금지</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      askpass 환경변수가 딸려 들어간다. 같은 함정은 <strong>GPG agent · SSH agent</strong> 에서도 재현될 수 있다.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">3. "갑자기" 의 디버깅</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      코드·설정은 안 바뀌었는데 동작이 달라지면 <strong>프로세스 env 부터 의심</strong>. <code>cat /proc/&lt;pid&gt;/environ | tr '\0' '\n'</code> 한 번이면 드러난다.
    </div>
  </div>

</div></div>

재발 방지로 systemd user service 로 전환하는 건 TODO 에 올려두었다.

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
