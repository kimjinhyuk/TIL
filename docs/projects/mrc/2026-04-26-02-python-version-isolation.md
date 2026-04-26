# #02 — Python 버전 지옥: 3.5 전용 SDK 와 3.10+ 메인 서버 공존시키기

> **MRC Engineering Notes · Episode 02** &middot; 6개 벤더 중 한 곳의 SDK 는 Python 3.5 전용. 나머지는 3.8+. 같은 인터프리터에 못 담는다는 사실에서 출발해, 어떤 격리 전략을 비교했고 왜 지금의 모양으로 정리됐는지를 정리한 글입니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 14px 20px;">
    <span style="color: #d2a8ff; font-weight: 700; font-size: 15px;">한 프로세스에 안 담기는 SDK 를 어떻게 포함시킬까</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">현재&nbsp;&nbsp;</span><strong>5개 벤더는 메인 서비스에 통합</strong>(Python 3.10+, FastAPI), 1개 벤더는 옵션</div>
    <div><span style="color:#3fb950; font-weight: 700;">옵션&nbsp;&nbsp;</span>① venv 격리 + IPC, ② Docker 컨테이너 격리, ③ 프로세스 브리지 — 3가지 비교</div>
    <div><span style="color:#f0883e; font-weight: 700;">선택&nbsp;&nbsp;</span>고객사 요청이 있을 때 <strong>Docker 컨테이너 + JSON-RPC 브리지</strong>로 정식 합류 예정</div>
    <div><span style="color:#f778ba; font-weight: 700;">교훈&nbsp;&nbsp;</span>"되는 것 먼저, 안 되는 것은 명시적으로 격리" — 무리하게 한 인터프리터에 묶지 않는다</div>
  </div>
</div></div>

---

## 현재 설계 / 구현

### 문제 정의 — 무엇이 충돌하는가

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">벤더</div>
    <div style="padding: 10px 14px;">SDK Python 호환</div>
    <div style="padding: 10px 14px;">메모</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #58a6ff;">A · B사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">3.8 ~ 3.11</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">메인 서비스에 동거</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e;">C사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">3.7 ~ 3.13</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">호환 범위 가장 넓음</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950;">D사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">C++ via pybind11 (Python 3.7+)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">빌드만 맞춰 두면 OK</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #d2a8ff;">E사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">3.7 ~ 3.11 (확인된 범위)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">메인 서비스에 동거</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr;">
    <div style="padding: 10px 14px; color: #f85149;">F사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;"><strong>3.5 전용</strong></div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">메인과 분리 필요</div>
  </div>
</div></div>

> 결국 메인 서비스를 **Python 3.10** 으로 고정하고, F사만 별도 격리 전략을 가져갑니다. 3.10 인 이유는 다섯 벤더 SDK 가 모두 안전하게 검증된 가장 보수적인 공통 분모이기 때문입니다.

### 격리 옵션 3가지 비교

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">① venv 격리 + IPC</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <strong style="color:#e6edf3;">방식</strong> 같은 호스트에 Python 3.5 가상환경을 따로 두고, FastAPI 본체와 stdin/stdout 또는 Unix socket 으로 통신.<br/>
      <strong style="color:#3fb950;">장점</strong> 추가 인프라 없음. 가장 가벼움.<br/>
      <strong style="color:#f85149;">단점</strong> 서버 OS 에 두 종류 파이썬을 깔아 두는 부담. 3.5 는 보안 패치가 끊긴 지 오래.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">② Docker 컨테이너</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <strong style="color:#e6edf3;">방식</strong> Python 3.5 SDK 만 들어 있는 컨테이너를 별도 서비스로 띄우고, JSON-RPC/REST 로 호출.<br/>
      <strong style="color:#3fb950;">장점</strong> 호스트 OS 오염 없음. 배포가 일관됨. SDK 파일들이 컨테이너 안에 봉인.<br/>
      <strong style="color:#f85149;">단점</strong> 컨테이너 1개 추가 → 배포/모니터링 비용. 컨테이너 안 SDK 가 호스트 네트워크에 직접 닿아야 할 수 있음.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #0a2117, #04260f); padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">③ 프로세스 브리지 레이어</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <strong style="color:#e6edf3;">방식</strong> SDK 호출만을 처리하는 작은 워커 프로세스를 매니저가 spawn — 요청마다 또는 세션마다.<br/>
      <strong style="color:#3fb950;">장점</strong> 메인 프로세스가 충돌해도 워커는 격리. 워커 재시작이 가벼움.<br/>
      <strong style="color:#f85149;">단점</strong> 프로세스 수명/리소스 관리 코드를 직접 짜야 함. 실패 모드가 다양해짐.
    </div>
  </div>

</div></div>

### 현재 채택 — 옵트인 Docker 컨테이너

지금은 메인 서비스에 F사가 **들어 있지 않습니다**. 고객사 요청이 들어왔을 때 **②번(Docker 컨테이너)** 방식으로 합류시킬 수 있도록 다음 구조를 준비해 두었습니다.

```text
┌──────────────────────────────────────────────────────────┐
│  MRC Backend (Python 3.10, FastAPI)                  │
│                                                          │
│   AdapterManager                                         │
│       ├─ A사 어댑터 (in-process)                         │
│       ├─ B사 어댑터 (in-process)                         │
│       ├─ C사 어댑터 (in-process)                         │
│       ├─ D사 어댑터 (pybind11, in-process)               │
│       ├─ E사 어댑터 (in-process)                         │
│       └─ F사 어댑터 (RemoteAdapter) ─── JSON-RPC ──┐     │
└─────────────────────────────────────────────────────│────┘
                                                      │
                                          ┌───────────▼──────────┐
                                          │  Legacy Worker        │
                                          │  (Python 3.5)         │
                                          │  F사 SDK 만 로드      │
                                          └──────────────────────┘
```

핵심은 두 가지:

1. **`RemoteAdapter` 도 `CoreRobot` 을 그대로 구현**합니다. 매니저/컨트롤러는 in-process 어댑터인지 RPC 어댑터인지 모릅니다.
2. **F사 워커는 `CoreRobot` 메서드 시그니처와 1:1 매칭되는 RPC 엔드포인트**를 노출합니다. 새 메서드가 늘어날 때 사이드카 인터페이스도 같이 갱신.

### RemoteAdapter — 같은 인터페이스, 다른 운반 수단

```python
# custom_robots/remote_robot.py
import requests
from ..core_robot import CoreRobot
from .errors import NotSupportedError

class RemoteRobot(CoreRobot):
    """
    Legacy Worker (다른 인터프리터) 에 JSON-RPC 로 위임하는 어댑터.
    Core 인터페이스는 유지하므로 컨트롤러는 차이를 모름.
    """

    def __init__(self, base_url: str, timeout: float = 5.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._session = requests.Session()

    def _call(self, method: str, **params):
        resp = self._session.post(
            f"{self._base_url}/rpc",
            json={"method": method, "params": params},
            timeout=self._timeout,
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("ok"):
            raise NotSupportedError(body.get("error", "remote error"))
        return body.get("result")

    def connect(self, ip: str) -> None: self._call("connect", ip=ip)
    def disconnect(self) -> None:        self._call("disconnect")
    def power_on(self) -> None:          self._call("power_on")
    def power_off(self) -> None:         self._call("power_off")
    def enable(self) -> None:            self._call("enable")
    def disable(self) -> None:           self._call("disable")
    def get_joint(self):                 return self._call("get_joint")
    def joint_move(self, target, speed): self._call("joint_move", target=list(target), speed=speed)
    def run_sequence(self, steps):       self._call("run_sequence", steps=list(steps))
```

워커 쪽은 `dispatcher` 한 장으로 메서드명을 SDK 호출에 매핑하면 됩니다 — 본 글에서는 생략.

### 트레이드오프 표 — 한눈에

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">관점</div>
    <div style="padding: 10px 14px;">venv + IPC</div>
    <div style="padding: 10px 14px;">Docker 컨테이너</div>
    <div style="padding: 10px 14px;">프로세스 브리지</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #8b949e;">호스트 오염</div>
    <div style="padding: 10px 14px; color: #f85149; font-size: 13px;">있음</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 13px;">없음</div>
    <div style="padding: 10px 14px; color: #f85149; font-size: 13px;">있음</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #8b949e;">배포 일관성</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">중</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 13px;">상</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">중</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #8b949e;">장애 격리</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">중</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 13px;">상</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 13px;">상</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #8b949e;">운영 비용</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 13px;">하</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">중</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">중</div>
  </div>
  <div style="display: grid; grid-template-columns: 100px 1fr 1fr 1fr;">
    <div style="padding: 10px 14px; color: #8b949e;">호출 지연</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 13px;">낮음</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">낮음~중</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 13px;">중</div>
  </div>
</div></div>

> 호출 빈도가 높지 않은(초당 수십 회 이내) 협동로봇 제어 도메인이라, 컨테이너 호출 지연은 실측에서도 의미 있는 병목이 아니었습니다. 그래서 **②번이 비용/안전 균형이 가장 좋다**는 결론입니다.

---

## 한계

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; Python 3.5 자체의 EOL</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Python 3.5 는 보안 패치가 끊긴 지 오래. 컨테이너로 격리한다 해도 외부 네트워크 노출은 최소화해야 함. 기본 정책: <strong>MRC 메인이 유일한 호출자</strong>.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 직렬화 오버헤드</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      RPC 라 인자/결과를 JSON 으로 직렬화. 큰 궤적 데이터(예: 수만 점의 조인트 시퀀스) 를 바로 전달하면 불리 — 워커가 파일/스트림을 읽도록 분리해야 할 수 있음.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 두 인터페이스의 동기화</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Core ABC 가 바뀌면 워커 RPC 도 같이 따라가야 함. 한쪽만 수정되면 런타임에서야 발견 — 계약 테스트가 필요.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 진단의 단절</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      메인 서비스 로그와 워커 로그가 분리됨. trace id 를 RPC 헤더로 흘리는 정도의 분산 추적 기본기가 빠지면 디버깅 시간이 늘어남.
    </div>
  </div>

</div></div>

---

## 개선 방향

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2.1;">
    <span style="color:#58a6ff; font-weight: 700;">1.</span> <strong>RPC 계약을 OpenAPI/JSON Schema 로 박제</strong> — 메인과 워커가 같은 스펙을 공유하고, 코드 생성으로 양쪽을 동기화. <br/>
    <span style="color:#f0883e; font-weight: 700;">2.</span> <strong>분산 trace 기본 탑재</strong> — RPC 헤더로 trace_id 전파, 양쪽 로그가 같은 ID 로 묶이게. <br/>
    <span style="color:#3fb950; font-weight: 700;">3.</span> <strong>큰 페이로드는 사이드 채널</strong> — 궤적/카메라 프레임은 RPC 가 아니라 공유 볼륨/스트림으로. <br/>
    <span style="color:#d2a8ff; font-weight: 700;">4.</span> <strong>워커 단위 헬스체크 + 자동 재기동</strong> — 컨테이너 헬스 엔드포인트 + 매니저의 회귀 정책. <br/>
    <span style="color:#f778ba; font-weight: 700;">5.</span> <strong>Capability 표면화</strong> — RemoteAdapter 가 워커에 "어떤 메서드를 지원하느냐" 를 묻고, 노드 에디터가 그 결과를 즉시 반영.
  </div>
</div></div>

---

## 다음 글 (예정)

- C++ SDK pybind11 통합 — 빌드 파이프라인과 호출 단위 connect/close 패턴
- 인스턴스 누수 / 동시 클라이언트 한도 — 싱글톤 매니저와 풀링
- 시뮬레이터 환경 표준 — 어댑터/브리지/호스트 네트워크 토폴로지 가이드

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
