# #00 — 시스템 전체 개요와 아키텍처 결정 기록 (ADR)

> **MRC Engineering Notes · Episode 00** &middot; 시리즈의 첫 글은 "지금의 MRC 가 왜 이 모습인가" 를 의사결정 단위로 남기는 게 목적입니다. 각 결정은 ADR (Architecture Decision Record) 카드로 정리했고, 이후 글들은 여기서 나온 결정들을 각자 깊이 파고듭니다. 벤더는 글 전체에서 **A · B · C · D · E · F사** 로 표기합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 14px 20px;">
    <span style="color: #58a6ff; font-weight: 700; font-size: 15px;">MRC 는 무엇이고 왜 이 스택인가</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#f0883e; font-weight: 700;">문제&nbsp;&nbsp;</span>벤더가 다른 6개 협동로봇을 <strong>같은 API · 같은 노드 에디터</strong>에서 제어하고 싶음. SDK 의 모양이 모두 제각각</div>
    <div><span style="color:#3fb950; font-weight: 700;">핵심&nbsp;&nbsp;</span><strong>FastAPI 단일 라우팅 컨트롤러 + Core ABC 어댑터</strong> 로 벤더 차이를 흡수, <strong>React + React Flow</strong> 노드 에디터에서 동작 시퀀스 작성</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">상태&nbsp;&nbsp;</span>Redis 를 가벼운 세션 컨텍스트/동작 캐시로 사용 (DB 도입 전까지)</div>
    <div><span style="color:#f778ba; font-weight: 700;">미래&nbsp;&nbsp;</span>ROS2 + AI 오케스트레이션 계층을 같은 추상화 위에 얹는 게 다음 시즌 목표</div>
  </div>
</div></div>

---

## 시스템 컨텍스트 — 무엇을 푸는가

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #161b22; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">사용자</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      협동로봇을 도입한 <strong>연구자 · 기업 · 개발자 · 학생</strong>. 서로 다른 벤더의 로봇을 한 화면에서 다루고 싶어하는 사람들.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #161b22; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">현장</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      한 작업셀에 <strong>여러 벤더의 로봇 + IO + 컨베이어</strong>가 섞여 있는 상황. 각각의 SDK 를 따로 다루기엔 비용이 큼.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #161b22; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">개발자</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      플랫폼을 확장하는 입장 &mdash; 새 로봇을 추가할 때 <strong>어댑터 한 장만 작성</strong>하면 끝나야 한다.
    </div>
  </div>

</div></div>

제약:

- **각 벤더 SDK 는 독립 진화** — 같은 "전원 켜기" 도 함수 시그니처가 모두 다름.
- **Python 버전 충돌** — 어떤 SDK 는 Python 3.5 만, 다른 SDK 는 3.8+ 만 지원. 한 프로세스에 다 못 담음.
- **노코드 사용자 / 코드 사용자 양쪽** — 노드 에디터로 만든 시퀀스도, 코드에서 직접 부르는 API 도 같은 모델 위에서 돌아야 함.

---

## 결정 맵 — 한눈에

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">#</div>
    <div style="padding: 10px 14px;">결정</div>
    <div style="padding: 10px 14px;">상태</div>
    <div style="padding: 10px 14px;">재평가 시점</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #58a6ff; font-family: monospace;">ADR-001</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">FastAPI + uv 단일 라우팅 컨트롤러</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">동시 세션 폭증 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e; font-family: monospace;">ADR-002</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">Core ABC + 벤더별 어댑터 패턴</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">&mdash;</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace;">ADR-003</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">Redis 를 1차 컨텍스트 저장소로 사용</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">관계형 분석 필요 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #d2a8ff; font-family: monospace;">ADR-004</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">React Flow 기반 노드 에디터 프론트</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">데스크톱 패러다임 전환 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f778ba; font-family: monospace;">ADR-005</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">JWT + IP 라우팅 (벤더 무관 식별)</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">멀티테넌시 도입 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f85149; font-family: monospace;">ADR-006</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">Python 버전 분기 — 1개 벤더는 옵션</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 12px;">&approx; Conditional</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">고객사 요청 시 IPC 브리지</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr;">
    <div style="padding: 10px 14px; color: #58a6ff; font-family: monospace;">ADR-007</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">ROS2 + AI 오케스트레이션은 다음 시즌</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 12px;">&#9633; Planned</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">MVP 단계 통과 후</div>
  </div>
</div></div>

---

## ADR-001 — FastAPI + uv 단일 라우팅 컨트롤러

<div style="padding: 12px 0;"><div style="border: 1px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 10px 16px;">
    <span style="color: #58a6ff; font-weight: 700;">ADR-001 &middot; 단일 라우팅 컨트롤러</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;6개 벤더 SDK 가 모두 다른 형태(C++ 바인딩, RPC, TCP, REST). 프론트는 한 개. 벤더별로 엔드포인트를 따로 노출하면 클라이언트가 분기 코드를 들고 다녀야 함.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<code>unified_controller.py</code> <strong>한 곳</strong>에서 프론트 요청을 받고, 토큰에 박혀 있는 <strong>벤더 식별자</strong>로 적절한 어댑터 인스턴스에 위임. 패키징은 <code>uv</code> 로 일원화.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 프론트는 벤더 차이를 모름. &plus; OpenAPI 스펙 한 장. &plus; uv 덕분에 락파일 해석/재현 빠름. &minus; 컨트롤러가 분기 지점이 되니 어댑터 로딩/싱글톤 관리 책임이 한 모듈에 몰림.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;동시 세션이 폭증하거나, 멀티테넌시(워크스페이스 격리)가 필요해지면 게이트웨이/큐 층 분리 검토.</div>
  </div>
</div></div>

---

## ADR-002 — Core ABC + 벤더별 어댑터

<div style="padding: 12px 0;"><div style="border: 1px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 10px 16px;">
    <span style="color: #f0883e; font-weight: 700;">ADR-002 &middot; Core ABC + 어댑터</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;같은 의미의 동작도 벤더별 함수가 다르고(<code>power_on</code>/<code>enable_robot</code>/<code>activate</code> &hellip;), 일부 벤더는 일부 동작이 아예 없음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;Python <code>abc.ABC</code> 로 <strong>공통 인터페이스</strong>를 정의(<code>core_robot.py</code>). <code>custom_robots/</code> 아래 각 벤더 어댑터가 이 인터페이스를 채우거나 <strong>NotSupported</strong> 로 명시적으로 비움.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 새 벤더 추가 = 어댑터 한 장. &plus; 누가 무엇을 못 하는지 코드에 박혀 있어 UI 가 노드 옵션을 동적으로 끔. &minus; ABC 가 너무 야무지면 마이너 동작 차이를 강제로 평준화하다 의미가 어긋남 &mdash; 도메인 분류를 의식적으로 좁게 두기로.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;공통화 안 되는 벤더 고유 기능이 누적되면 <strong>Capability 인터페이스</strong> (옵트인 mixin) 추가.</div>
  </div>
</div></div>

이 결정의 디테일은 [#01 — 멀티벤더 통합 아키텍처](./2026-04-26-01-multi-vendor-architecture.md) 에서 코드 단위로 깊게 다룹니다.

---

## ADR-003 — Redis 를 1차 컨텍스트 저장소로

<div style="padding: 12px 0;"><div style="border: 1px solid #3fb950; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0a2117, #04260f); padding: 10px 16px;">
    <span style="color: #3fb950; font-weight: 700;">ADR-003 &middot; Redis 우선</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;저장해야 하는 데이터가 사실상 <strong>세션 컨텍스트</strong>(접속한 로봇 IP, 벤더, 토큰)와 <strong>동작 시퀀스 임시본</strong>. 분석 쿼리는 아직 필요 없음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<strong>Redis 단독</strong>으로 시작. 로그인 시 <code>{IP, 벤더, 토큰 만료}</code> 를 키에 넣고, 시퀀스는 리스트로 저장. 관계형 DB 는 명시적 요구가 생기면 도입.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 인프라 1개. &plus; TTL 로 세션 정리 자동화. &minus; 다중 시퀀스 비교/통계 쿼리는 약함 &mdash; 향후 Postgres 로 이주할 때를 가정해 키 네임스페이스를 도메인별로 정리해 둠.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;동작 시퀀스 버전 관리/공유 기능이 들어가면 관계형 DB 추가.</div>
  </div>
</div></div>

---

## ADR-004 — React Flow 기반 노드 에디터

<div style="padding: 12px 0;"><div style="border: 1px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 10px 16px;">
    <span style="color: #d2a8ff; font-weight: 700;">ADR-004 &middot; React Flow 노드 에디터</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;사용자 페르소나가 넓음. 코드 작성 없이 동작을 구성하고 싶은 사람과, 그 시퀀스를 코드로 다시 다루고 싶은 사람이 공존.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<strong>React + React Flow</strong> 로 노드 그래프를 구성하고, <strong>TailwindCSS + Shadcn/UI</strong> 로 UI 일관성 확보. 노드 그래프는 직렬화 가능한 JSON 으로 저장 &rarr; 백엔드는 그 JSON 을 어댑터 호출로 풀어 실행.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; "노드 = 어댑터 메서드" 매핑이 자연스러움. &plus; 디자이너가 만져도 깨지지 않는 디자인 토큰 체계. &minus; 복잡한 분기/루프는 노드만으로 표현이 어려워 <strong>"코드 노드"</strong>(Python 스니펫 노드) 도입을 검토 중.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;데스크톱 IDE 형 도구로 패러다임을 옮길 때.</div>
  </div>
</div></div>

---

## ADR-005 — JWT + IP 라우팅

<div style="padding: 12px 0;"><div style="border: 1px solid #f778ba; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2a0f1f, #1a0a14); padding: 10px 16px;">
    <span style="color: #f778ba; font-weight: 700;">ADR-005 &middot; JWT + IP 라우팅</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;사용자가 처음 로봇을 등록할 때 입력하는 정보는 사실상 <strong>로봇 IP + 벤더 종류</strong> 두 개. 이후 모든 동작 호출은 이 컨텍스트로 라우팅돼야 함.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<code>/set_ip</code> 호출 시 IP/벤더를 검증한 뒤 <strong>JWT 토큰</strong>을 발급해 클라이언트에 돌려준다. 이후 모든 요청 헤더에 토큰을 실으면 컨트롤러가 <strong>토큰 &rarr; (IP, 벤더)</strong> 로 풀어 어댑터를 선택.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 프론트는 한 번 로그인하면 벤더 신경 안 씀. &plus; 토큰 만료로 끊긴 세션 자동 정리. &minus; 토큰을 모르고 직접 IP 를 던지면 안 되도록 미들웨어로 강제. &minus; 토큰 시크릿은 환경변수로만 관리.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;여러 사용자가 같은 로봇을 공유하거나, 워크스페이스/조직 단위 권한이 들어가면 RBAC 도입.</div>
  </div>
</div></div>

---

## ADR-006 — Python 버전 분기 (1개 벤더 옵션화)

<div style="padding: 12px 0;"><div style="border: 1px solid #f85149; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2a0f0f, #1a0606); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #f85149; font-weight: 700;">ADR-006 &middot; Python 버전 분기</span>
    <span style="color: #f0883e; font-size: 12px; background: #2d1a04; border: 1px solid #5a3600; border-radius: 12px; padding: 2px 8px;">Conditional</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;6개 벤더 중 한 곳의 SDK 가 <strong>Python 3.5 전용</strong>. 나머지는 3.8+ 만 지원. 한 프로세스에 함께 못 담음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<strong>5개 벤더는 메인 서비스 안에 통합</strong>, 1개 벤더는 <strong>옵션</strong>으로 분리. 고객사가 명시적으로 요청하면 venv 격리 / Docker / IPC 브리지 중 하나로 붙임.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 메인 서버 안정성 확보. &plus; "되는 것"부터 빠르게 시장에 노출. &minus; 동일한 ABC 로 흡수하지 못한 벤더가 1개 남음. 시장 요구에 따라 IPC 브리지를 정식화할 예정.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;해당 벤더의 SDK 가 신버전 Python 을 지원하는 순간 통합으로 합류.</div>
  </div>
</div></div>

세 가지 격리 옵션의 트레이드오프는 [#02 — Python 버전 격리 전략](./2026-04-26-02-python-version-isolation.md) 에서 자세히 다룹니다.

---

## ADR-007 — ROS2 + AI 오케스트레이션은 다음 시즌

<div style="padding: 12px 0;"><div style="border: 1px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #58a6ff; font-weight: 700;">ADR-007 &middot; ROS2 + AI 오케스트레이션</span>
    <span style="color: #f0883e; font-size: 12px; background: #2d1a04; border: 1px solid #5a3600; border-radius: 12px; padding: 2px 8px;">Planned</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;장기적으로는 단순 노드 매크로가 아니라 <strong>LLM/Agent 가 작업을 계획·재조정</strong>하는 시스템을 지향. 또한 ROS2 가 사실상 표준이 되어 가는 흐름을 외면할 수 없음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;MVP 단계에서는 <strong>도입하지 않음</strong>. 대신 Core ABC 가 향후 ROS2 노드/토픽으로 그대로 매핑될 수 있게 인터페이스 이름과 의미를 ROS2 관습에 맞춰 정리.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 지금 단계에서는 복잡도 폭발 회피. &plus; 다음 시즌 진입 비용을 낮춤. &minus; 그 사이에 들어오는 신규 코드가 ROS2 모델과 어긋나면 나중에 갈아엎어야 함 &mdash; 코드 리뷰 가이드에 ROS2 호환성 체크 추가.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;MVP 가 안정화되고, 멀티 로봇 협조/AI 동적 계획 요구가 들어오는 시점.</div>
  </div>
</div></div>

---

## 한계 — 지금의 MRC 가 안고 있는 것들

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 통합 안 된 벤더 1개</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Python 3.5 전용 SDK 를 쓰는 1개 벤더는 본 서버에 합류하지 못하고 옵션으로 남음. 격리 전략은 <code>#02</code> 에서.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; ABC 강제력의 한계</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      벤더 고유 능력을 ABC 에 욱여넣기 시작하면 의미가 흐려짐. 그렇다고 빼면 노드 에디터에서 "이 로봇만의 기능" 을 표현하기 어려움.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 분석/감사 기록 약함</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Redis 만으로 운영 중 &mdash; 누가 어떤 시퀀스를 언제 돌렸는지 시계열로 보기 어려움. 관계형 DB 도입 시 함께 해결 예정.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 시뮬레이션 부족</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      벤더에 따라 시뮬레이터 환경이 천차만별. 일부 함수는 실기가 없으면 검증 불가 &mdash; 회귀 테스트 자동화에 제약.
    </div>
  </div>

</div></div>

---

## 개선 방향 — 다음 단계

이 시리즈의 후속 글들이 각 항목을 구체화합니다.

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2.1;">
    <span style="color:#58a6ff; font-weight: 700;">1.</span> <strong>어댑터 패턴 정식화</strong> — 옵트인 Capability mixin, NotSupported 시각화 (#01) <br/>
    <span style="color:#f0883e; font-weight: 700;">2.</span> <strong>Python 버전 격리 전략</strong> — venv / Docker / IPC 브리지 비교 + 채택 기준 (#02) <br/>
    <span style="color:#3fb950; font-weight: 700;">3.</span> <strong>C++ SDK pybind11 통합</strong> — 빌드 파이프라인 표준화 (예정) <br/>
    <span style="color:#d2a8ff; font-weight: 700;">4.</span> <strong>인스턴스 누수/연결 한도 대응</strong> — 싱글톤 매니저, 풀링 (예정) <br/>
    <span style="color:#f778ba; font-weight: 700;">5.</span> <strong>시뮬레이터 환경 표준</strong> — 네트워크 토폴로지 가이드, CI 통합 (예정) <br/>
    <span style="color:#58a6ff; font-weight: 700;">6.</span> <strong>관계형 DB 도입</strong> — 동작 시퀀스 버전 관리, 감사 (예정) <br/>
    <span style="color:#f0883e; font-weight: 700;">7.</span> <strong>ROS2 + AI 오케스트레이션</strong> — Core ABC 의 ROS2 매핑, LLM 계획기 통합 (다음 시즌)
  </div>
</div></div>

---

## 다음 글

- [#01 — 멀티벤더 협동로봇 통합 아키텍처: Core ABC + 어댑터 패턴](./2026-04-26-01-multi-vendor-architecture.md)
- [#02 — Python 버전 지옥: 3.5 전용 SDK 와 3.10+ 메인 서버 공존시키기](./2026-04-26-02-python-version-isolation.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
