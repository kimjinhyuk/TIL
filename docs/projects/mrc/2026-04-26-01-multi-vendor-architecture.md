# #01 — 멀티벤더 협동로봇 통합 아키텍처: Core ABC + 어댑터 패턴

> **MRC Engineering Notes · Episode 01** &middot; 6개 벤더(A · B · C · D · E · F사) 협동로봇을 같은 API · 같은 노드 에디터에서 다루기 위해 어떤 추상화를 도입했는지, 그리고 그 추상화가 어디서 흔들렸는지 정리한 글입니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 14px 20px;">
    <span style="color: #f0883e; font-weight: 700; font-size: 15px;">멀티벤더 SDK 를 한 인터페이스로 흡수하는 법</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">추상&nbsp;&nbsp;</span><code>core_robot.py</code> 에 <strong>Python ABC</strong> 로 공통 메서드 정의 — 모든 벤더 어댑터가 이 인터페이스를 구현</div>
    <div><span style="color:#3fb950; font-weight: 700;">분기&nbsp;&nbsp;</span>JWT 토큰 → (벤더, IP) 풀어서 <strong>적절한 어댑터 인스턴스로 라우팅</strong></div>
    <div><span style="color:#d2a8ff; font-weight: 700;">차이&nbsp;&nbsp;</span>전원/활성화처럼 벤더별로 절차가 다른 부분은 <strong>NotSupported 명시 + 라이프사이클 매핑</strong></div>
    <div><span style="color:#f778ba; font-weight: 700;">함정&nbsp;&nbsp;</span>인스턴스 중복 생성, 동시 클라이언트 한도 — <strong>IP당 싱글톤 매니저</strong>로 정리</div>
  </div>
</div></div>

---

## 현재 설계 / 구현

### 큰 그림

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 12px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr;">
    <div style="padding: 14px 16px; border-right: 1px solid #30363d;">
      <div style="color: #58a6ff; font-weight: 700; font-size: 13px;">1. 입력 — Frontend</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 8px; line-height: 1.7;">React Flow 노드 시퀀스가 <code>{action, params}</code> 리스트로 직렬화. 헤더에 JWT 토큰.</div>
    </div>
    <div style="padding: 14px 16px; border-right: 1px solid #30363d;">
      <div style="color: #f0883e; font-weight: 700; font-size: 13px;">2. 라우팅 — Unified Controller</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 8px; line-height: 1.7;">FastAPI 컨트롤러가 토큰을 풀어 <code>(IP, 벤더)</code> 추출 → <strong>어댑터 매니저</strong>에서 인스턴스 획득.</div>
    </div>
    <div style="padding: 14px 16px;">
      <div style="color: #3fb950; font-weight: 700; font-size: 13px;">3. 실행 — Adapter</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 8px; line-height: 1.7;">벤더 SDK 호출. 응답을 <strong>공통 응답 스키마</strong>로 매핑해 컨트롤러로 반환.</div>
    </div>
  </div>
</div></div>

### Core ABC — 공통 인터페이스

```python
# core_robot.py
from abc import ABC, abstractmethod
from typing import Sequence

class CoreRobot(ABC):
    """
    모든 벤더 어댑터가 구현해야 하는 공통 인터페이스.

    기본 원칙
    - 의미 단위로 좁게 정의한다 (벤더 함수와 1:1 매핑이 아니라 '의미' 매핑).
    - 지원하지 않는 동작은 NotSupportedError 를 던진다 (조용히 패스 금지).
    - 부수효과 있는 동작은 모두 멱등(idempotent) 하도록 어댑터에서 보정한다.
    """

    # --- 라이프사이클 ---
    @abstractmethod
    def connect(self, ip: str) -> None: ...

    @abstractmethod
    def disconnect(self) -> None: ...

    @abstractmethod
    def power_on(self) -> None: ...

    @abstractmethod
    def power_off(self) -> None: ...

    @abstractmethod
    def enable(self) -> None: ...

    @abstractmethod
    def disable(self) -> None: ...

    # --- 동작 ---
    @abstractmethod
    def get_joint(self) -> Sequence[float]: ...

    @abstractmethod
    def joint_move(self, target: Sequence[float], speed: float) -> None: ...

    # --- 시퀀스 ---
    @abstractmethod
    def run_sequence(self, steps: Sequence[dict]) -> None: ...
```

> 어댑터에서 의미상 `enable` 단계가 없는 벤더는 `enable()` 을 `pass` 로 두는 게 아니라, **컨트롤러 단에서 합쳐 부르는 라이프사이클 매크로**(`prepare()`)를 통해 호출 순서를 통일합니다. 그래야 노드 에디터의 "준비 노드" 한 개가 어떤 벤더든 같은 의미로 동작합니다.

### 어댑터 매니저 — 인스턴스 라이프사이클

여러 벤더 SDK 가 공통적으로 보였던 패턴 두 개:

1. **인스턴스를 여러 개 만들면 내부에서 충돌** → 하나만 살려야 함.
2. **컨트롤러가 동시 5개를 초과하면 기존 연결까지 끊김** → 풀링/제한 필요.

이걸 어댑터 안에서 풀면 어댑터마다 같은 코드를 반복하게 됨. 그래서 매니저가 책임지도록 분리:

```python
# adapter_manager.py
import threading
from typing import Dict, Type
from .core_robot import CoreRobot

class AdapterManager:
    """
    (vendor, ip) → CoreRobot 인스턴스를 단일하게 보장.
    프로세스 종료 시 일괄 disconnect.
    """
    _registry: Dict[str, Type[CoreRobot]] = {}
    _instances: Dict[tuple, CoreRobot] = {}
    _lock = threading.Lock()

    @classmethod
    def register(cls, vendor: str, adapter_cls: Type[CoreRobot]) -> None:
        cls._registry[vendor] = adapter_cls

    @classmethod
    def acquire(cls, vendor: str, ip: str) -> CoreRobot:
        key = (vendor, ip)
        with cls._lock:
            if key in cls._instances:
                return cls._instances[key]
            adapter_cls = cls._registry[vendor]
            instance = adapter_cls()
            instance.connect(ip)
            cls._instances[key] = instance
            return instance

    @classmethod
    def release_all(cls) -> None:
        with cls._lock:
            for instance in cls._instances.values():
                try:
                    instance.disconnect()
                except Exception:
                    pass
            cls._instances.clear()
```

> 어댑터 매니저가 어댑터를 알고는 있지만, 어댑터는 매니저를 모릅니다. 단방향 의존성 — 어댑터를 단독 테스트할 때 매니저 없이도 인스턴스를 만들 수 있어야 합니다.

### 라이프사이클 매핑 — 벤더별 절차 차이

전원·활성화 단계가 벤더마다 다릅니다. 같은 의미(`준비 완료`) 에 도달하는 경로가 1단계인 곳도, 4단계인 곳도 있습니다.

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">벤더</div>
    <div style="padding: 10px 14px;">connect</div>
    <div style="padding: 10px 14px;">power_on</div>
    <div style="padding: 10px 14px;">enable</div>
    <div style="padding: 10px 14px;">비고</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #58a6ff;">A사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">RPC login</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">전용 API</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">전용 API</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">power/enable 분리됨</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e;">B사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">RPC connect</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">NotSupported</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">자동</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">로그인 시 활성화</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950;">C사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">RTDE 인터페이스</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">자동</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">전용 API</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">실기 의존 함수 다수</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #d2a8ff;">D사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">C++ via pybind11</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">자동</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">access control</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">호출별로 connect/close 묶기</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f778ba;">E사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">SDK init</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">자동</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">전용 API</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">동시 클라이언트 5개 한도</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr;">
    <div style="padding: 10px 14px; color: #f85149;">F사</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">Python 3.5 SDK</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">옵션 모드</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">옵션 모드</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">메인 서비스 분리 (#02 참고)</div>
  </div>
</div></div>

> 표의 "자동" 은 그 단계를 호출할 필요가 **없다는 의미**, "NotSupported" 는 그 개념 자체가 SDK 에 **없다는 의미**입니다. 사용자가 노드 에디터에서 해당 노드를 만들 때 **벤더에 따라 자동으로 비활성화** 됩니다.

### 어댑터 한 장 — 골격 예시

벤더가 누구든 새 어댑터는 이 형태에서 출발합니다.

```python
# custom_robots/example_robot.py
from ..core_robot import CoreRobot
from .errors import NotSupportedError

class ExampleRobot(CoreRobot):
    def __init__(self) -> None:
        self._sdk = None

    def connect(self, ip: str) -> None:
        from vendor_sdk import VendorClient   # 어댑터 안에서만 import
        self._sdk = VendorClient(ip)
        self._sdk.login()

    def disconnect(self) -> None:
        if self._sdk is not None:
            self._sdk.logout()
            self._sdk = None

    def power_on(self) -> None:
        # 이 벤더는 로그인 시 자동 인가됨
        return

    def power_off(self) -> None:
        raise NotSupportedError("이 SDK 는 외부에서 power_off 를 노출하지 않음")

    def enable(self) -> None:
        self._sdk.servo_on()

    def disable(self) -> None:
        self._sdk.servo_off()

    def get_joint(self):
        return self._sdk.read_joint()

    def joint_move(self, target, speed):
        self._sdk.move_j(target, speed=speed)

    def run_sequence(self, steps):
        for s in steps:
            self.joint_move(s["target"], s.get("speed", 0.5))
```

---

## 한계

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; ABC 가 평준화하는 만큼 잃는다</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      벤더별 고유 동작(예: 충돌 감응도, 전류 제어, 임피던스 모드)이 ABC 에 다 안 들어감. 들어가도 일부 벤더는 NotSupported &mdash; UX 가 너덜너덜.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 응답/에러 코드 통일이 어려움</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      각 SDK 가 던지는 에러 종류가 모두 다름. 매니저까지 올라오기 전에 어댑터가 <strong>의미 단위</strong>로 매핑해야 하는데, 매핑 표가 6개 따로 자라는 중.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 동시성 정책이 부서마다 다름</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      어떤 SDK 는 한 인스턴스가 모든 호출을 직렬화해야 안전하고, 어떤 SDK 는 멀티스레드 안전. AdapterManager 가 "공통 잠금"을 걸면 빠른 SDK 가 손해, 안 걸면 느린 SDK 가 깨짐.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 시뮬 의존도</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      어댑터 단위 테스트는 fake SDK 로 가능하지만, 실제 라이프사이클 검증은 시뮬레이터/실기 의존. CI 자동화가 어렵다.
    </div>
  </div>

</div></div>

---

## 개선 방향

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2.1;">
    <span style="color:#58a6ff; font-weight: 700;">1.</span> <strong>Capability 인터페이스 도입</strong> — 핵심 ABC 는 좁게 유지하고, 옵트인 Mixin (예: <code>HasImpedanceControl</code>, <code>HasIO</code>) 으로 벤더 능력을 표현. 노드 에디터는 mixin 을 reflect 해서 노드 옵션을 동적으로 노출. <br/>
    <span style="color:#f0883e; font-weight: 700;">2.</span> <strong>표준 에러 코드 사전</strong> — 어댑터 매핑 표를 모듈로 끌어올리고, 새 어댑터가 들어올 때 매핑 누락이 컴파일타임에 잡히게 한다. <br/>
    <span style="color:#3fb950; font-weight: 700;">3.</span> <strong>어댑터별 동시성 모드 선언</strong> — <code>concurrency = "serial" | "thread-safe"</code> 메타데이터를 어댑터에서 노출, 매니저는 그에 맞춰 잠금 정책을 선택. <br/>
    <span style="color:#d2a8ff; font-weight: 700;">4.</span> <strong>fake 어댑터 표준화</strong> — 모든 어댑터에 짝이 되는 fake 를 강제. CI 에서 노드 시퀀스 → fake 실행 회귀 테스트. <br/>
    <span style="color:#f778ba; font-weight: 700;">5.</span> <strong>ROS2 이름 호환</strong> — Core ABC 의 메서드 이름과 의미를 ROS2 표준 인터페이스(예: <code>FollowJointTrajectory</code>) 로 매핑할 수 있도록 정리.
  </div>
</div></div>

---

## 다음 글

- [#02 — Python 버전 지옥: 3.5 전용 SDK 와 3.10+ 메인 서버 공존시키기](./2026-04-26-02-python-version-isolation.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
