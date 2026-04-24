# #00 — 시스템 전체 개요와 아키텍처 결정 기록 (ADR)

> **DRP Engineering Notes · Episode 00** &middot; 이 시리즈의 첫 글은 "지금의 DRP 가 왜 이 모습인가" 를 의사결정 단위로 남기는 게 목적입니다. 각 결정은 ADR (Architecture Decision Record) 카드로 정리했고, 이후 9편의 글은 여기에 나온 결정들을 각자 깊이 파고듭니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 14px 20px;">
    <span style="color: #58a6ff; font-weight: 700; font-size: 15px;">DRP 는 무엇이고 왜 이 스택인가</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#f0883e; font-weight: 700;">문제&nbsp;&nbsp;</span>사진 한 장 &rarr; 로봇팔이 A4 에 드로잉. 현장 여러 곳에 배포된 로봇을 원격으로 운영</div>
    <div><span style="color:#3fb950; font-weight: 700;">핵심&nbsp;&nbsp;</span>Android Java 앱으로 시작 &rarr; <strong>Python(FastAPI) 백엔드 + Flutter 프론트</strong>로 재구성, 모노레포로 통합</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">로봇&nbsp;&nbsp;</span>JAKA 컨트롤러와 <strong>raw TCP/JSON 프로토콜</strong> 직접 통신 (SDK 미사용)</div>
    <div><span style="color:#f778ba; font-weight: 700;">운영&nbsp;&nbsp;</span>SQLite + MinIO + Tailscale VPN 기반 <strong>pull-model 중앙 모니터링</strong></div>
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
      이벤트 현장의 일반 관람객. 태블릿에서 사진을 찍고 <strong>로봇이 그리는 과정을 보는 경험</strong>이 1차 가치.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #161b22; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">현장</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      전국 복수 지점. 각 현장은 <strong>태블릿 + 온프레미스 서버 + JAKA 로봇</strong> 한 세트. 인터넷 품질이 균일하지 않음.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #161b22; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">운영자</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      본사에서 <strong>현장 상태를 한 번에 보고 싶음</strong> — 로봇 연결/펜 캘리브레이션/디스크/AI 응답 시간까지.
    </div>
  </div>

</div></div>

제약:

- **현장 서버는 외부에서 직접 접근 불가** — Tailscale 으로만 들어감
- **태블릿 앱은 업데이트 주기가 느림** — 스토어 검수 이슈, 기능은 가능한 한 서버에서 처리
- **한 번 멈추면 현장 담당자가 실시간으로 디버깅해야 함** — 로그와 상태가 원격에서 즉시 보여야 함

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
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">모노레포 + Git Subtree</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">현장 10 개 초과 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e; font-family: monospace;">ADR-002</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">FastAPI + uv</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">&mdash;</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace;">ADR-003</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">SQLite 복수 인스턴스 (한 현장 = 한 DB)</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">동시 쓰기 충돌 발생 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #d2a8ff; font-family: monospace;">ADR-004</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">Flutter 프론트 (iOS/Android 공통)</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">웹 현장 추가 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f778ba; font-family: monospace;">ADR-005</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">JAKA raw TCP/JSON (SDK 미사용)</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">새 로봇 벤더 추가 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f85149; font-family: monospace;">ADR-006</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">게이트웨이 분리 &rarr; 직접 TCP 단일 모드로 회귀</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 12px;">&#8630; Superseded</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">멀티 로봇 도입 시</div>
  </div>
  <div style="display: grid; grid-template-columns: 80px 1.4fr 0.8fr 0.8fr;">
    <div style="padding: 10px 14px; color: #58a6ff; font-family: monospace;">ADR-007</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">pull-model 모니터링 + Tailscale</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px;">&check; Accepted</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px;">현장 &gt; 20 개 또는 SLA 필요 시</div>
  </div>
</div></div>

---

## ADR-001 — 모노레포 + Git Subtree

<div style="padding: 12px 0;"><div style="border: 1px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 10px 16px;">
    <span style="color: #58a6ff; font-weight: 700;">ADR-001 &middot; 모노레포 + Git Subtree</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;Python 백엔드 / Flutter 앱 / Python 모니터링 3개 서비스가 초반엔 각각 독립 레포. 배포 스크립트가 세 군데에 분산되고 버전 정합이 어려움.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<code>drp/</code> 한 레포 아래 <code>backend/</code> · <code>frontend/</code> · <code>monitoring/</code> · <code>docs/</code> 를 둔다. 기존 레포 히스토리를 <strong>Git Subtree</strong> 로 통합해 커밋 기록을 살린다.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; PR 하나로 API 계약 + 클라이언트 변경을 동시 리뷰. &plus; 태그 한 번으로 버전 정합. &minus; 클론 용량 증가. &minus; Flutter 빌드 캐시가 루트에 섞임 &rarr; <code>.gitignore</code> 주의.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;서비스가 더 늘거나 서로 다른 릴리즈 주기가 강제되면 polyrepo 로 되돌림.</div>
  </div>
</div></div>

---

## ADR-002 — FastAPI + uv

<div style="padding: 12px 0;"><div style="border: 1px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 10px 16px;">
    <span style="color: #f0883e; font-weight: 700;">ADR-002 &middot; FastAPI + uv</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;이미지 처리(OpenCV), 외부 API(Gemini), 로봇 TCP 가 혼재. 태블릿 요청 폭이 고르지 않음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<strong>FastAPI + uvicorn</strong>. 패키징/가상환경은 <strong>uv</strong> (pip 대비 수 배 빠른 락파일 해석). Pydantic v2 로 요청/응답 검증.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; OpenAPI 자동 스펙으로 Flutter 팀과 계약 맞추기가 쉬움. &plus; async 기본이라 외부 API · I/O 병행 처리가 자연스러움. &minus; <strong>동기 라이브러리(OpenCV · TCP socket)</strong> 를 이벤트 루프 안에서 부주의하게 호출하면 전체 요청이 정지 &rarr; <code>asyncio.to_thread</code> 규칙을 코드 리뷰 체크리스트에 고정.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;없음. 프레임워크 수명이 충분히 길다.</div>
  </div>
</div></div>

---

## ADR-003 — SQLite 복수 인스턴스 (한 현장 = 한 DB)

<div style="padding: 12px 0;"><div style="border: 1px solid #3fb950; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0a2117, #04260f); padding: 10px 16px;">
    <span style="color: #3fb950; font-weight: 700;">ADR-003 &middot; SQLite 복수 인스턴스</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;각 현장은 독립적. 저장할 데이터는 드로잉 히스토리 · 펜 캘리브레이션 · 캔버스 위치 · 이벤트 QR 스캔 같은 <strong>현장 국소적</strong> 상태. 건수는 많아야 일 수천.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<strong>SQLite 파일을 목적별로 분리 (4 개)</strong>. 백엔드 저장소는 각 store 모듈이 자신의 DB 파일 관리.
      <br/>&nbsp;&nbsp;&#8226; <code>drawing_history.db</code> · <code>pen_calibration.db</code> · <code>canvas_position.db</code> · <code>event_scan.db</code>
    </div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 백업/복구가 파일 복사 수준. &plus; 스키마가 도메인별로 독립 &rarr; 마이그레이션 영향 범위 최소. &minus; 여러 도메인을 가로지르는 조회가 어렵고, 상위 요약은 모니터링 서버에 push 해야 함.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;동시 쓰기 경합 심화 / 동일 서버에 여러 로봇 배치 / 분석형 쿼리 필요.</div>
  </div>
</div></div>

---

## ADR-004 — Flutter 프론트

<div style="padding: 12px 0;"><div style="border: 1px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 10px 16px;">
    <span style="color: #d2a8ff; font-weight: 700;">ADR-004 &middot; Flutter (iOS/Android 공통)</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;태블릿 현장용. 카메라 · 다국어 · 오프라인 드로잉 모드가 필요. iOS 와 Android 둘 다 지원해야 하고 현장에 따라 기기가 다름.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;<strong>Flutter + Riverpod</strong> 으로 단일 코드베이스. 상태관리 · 카메라 · 로컬 저장까지 stack 표준화.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 공통 UI 유지비용 절감. &plus; 오프라인 드로잉(벡터화 + TCP) 을 앱 안에서 단독 실행 가능 &mdash; 서버가 잠시 죽어도 체험은 유지. &minus; 네이티브 권한 / 카메라 이슈는 여전히 플랫폼별로 드러남.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;브라우저 기반 kiosk 가 생기면 Next.js 등 웹 스택 병행 검토.</div>
  </div>
</div></div>

---

## ADR-005 — JAKA raw TCP/JSON (SDK 미사용)

<div style="padding: 12px 0;"><div style="border: 1px solid #f778ba; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2a0f1f, #1a0a14); padding: 10px 16px;">
    <span style="color: #f778ba; font-weight: 700;">ADR-005 &middot; raw TCP/JSON 프로토콜 직접 사용</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;JAKA 컨트롤러는 자체 SDK(C++/Python 바인딩)도 제공하지만, <strong>원본 Android Java 앱이 이미 raw TCP(port 10001)</strong> 로 동작하고 있었음. 마이그레이션 안정성과 의존성 최소화가 초기 우선순위였음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;Python <code>socket</code> 모듈로 <strong>line-based JSON 을 직접 주고받는다</strong>. SDK 의존성 0. Java 코드의 명령 포맷/타이밍을 1:1 로 옮김.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 네이티브 빌드 의존성 없음 &rarr; Alpine 기반 도커 이미지 가능. &plus; 원본 Java 동작과 1:1 검증 가능. &minus; 프로토콜 명세는 문서화해 두지 않으면 구전. &minus; 복잡한 경로 계획(Impedance control 등) 은 재구현 부담.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;비-JAKA 로봇 추가 시 &rarr; 벤더 중립 <strong>RobotClient 추상화</strong> 레이어 설계가 선행되어야 함 (#02 에서 구체화).</div>
  </div>
</div></div>

---

## ADR-006 — 게이트웨이 분리 → 직접 TCP 단일 모드로 회귀

<div style="padding: 12px 0;"><div style="border: 1px solid #f85149; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2a0f0f, #1a0606); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #f85149; font-weight: 700;">ADR-006 &middot; 게이트웨이 &rarr; 직접 TCP 단일 모드</span>
    <span style="color: #f0883e; font-size: 12px; background: #2d1a04; border: 1px solid #5a3600; border-radius: 12px; padding: 2px 8px;">Superseded</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;초기엔 백엔드가 직접 로봇 TCP 를 잡지 않고 <strong>별도 gateway 프로세스</strong>를 거치는 설계. "로컬 폴백 저장소"도 있었음. 분리가 좋다는 막연한 믿음.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;운영을 돌려본 결과 &mdash; gateway 는 <strong>매번 한 홉 더 생기는 장애 지점</strong>이었고, 폴백 저장소는 실제로 거의 쓰이지 않았음. 제거하고 <strong>백엔드가 직접 TCP 를 잡는 단일 모드</strong> 로 회귀.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 문제 발생 시 로그 경로가 명확. &plus; 도커 서비스 2 개 감소 &rarr; 리소스/배포 단순화. &minus; 미래에 <strong>멀티 로봇 동시 제어</strong>가 필요해지면 다시 gateway/큐 층을 꺼내야 함.</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;한 현장 서버에 로봇이 2 대 이상 붙거나, 로봇 제어를 외부 워커에서 실행해야 할 때.</div>
  </div>
</div></div>

---

## ADR-007 — pull-model 모니터링 + Tailscale

<div style="padding: 12px 0;"><div style="border: 1px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 10px 16px;">
    <span style="color: #58a6ff; font-weight: 700;">ADR-007 &middot; pull-model 모니터링</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13.5px; line-height: 1.9;">
    <div><strong style="color:#8b949e;">컨텍스트</strong> &nbsp;현장 서버는 방화벽 뒤. 외부에서 직접 접근 불가. 하지만 본사 담당자는 전체 현장 상태가 필요.</div>
    <div><strong style="color:#3fb950;">결정</strong> &nbsp;Tailscale 로 현장 서버를 메시 네트워크에 올린다. 중앙 <strong>monitoring</strong> 서비스가 <strong>on-demand check</strong> 로 현장 <code>/api/v1/system/health-detail</code> 을 호출해 상태를 수집. 현장에서는 <strong>heartbeat reporter</strong> 가 주기적으로 같은 데이터를 push 하되, 네트워크가 끊기면 <code>deque(maxlen=1000)</code> 에 버퍼링 &rarr; 복구 후 일괄 전송.</div>
    <div><strong style="color:#f0883e;">결과</strong> &nbsp;&plus; 양방향 인지 &mdash; 중앙이 물어볼 수도, 현장이 말해줄 수도 있음. &plus; 인터넷 단절 구간도 손실 없이 흡수. &minus; 메트릭 포맷이 <strong>JSON blob</strong> 이라 분석이 약함 &rarr; Prometheus/OpenTelemetry 로 진화 필요 (#08 에서 구체화).</div>
    <div><strong style="color:#d2a8ff;">재평가 트리거</strong> &nbsp;현장이 20 곳을 넘거나, SLA 가 생기면.</div>
  </div>
</div></div>

---

## 한계 — 지금의 DRP 가 안고 있는 것들

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 프로토콜이 구전</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      JAKA 명령 포맷/에러코드는 Java 원본 코드 + 벤더 매뉴얼 + 실전 삽질로만 기록. 신규 합류자가 맨땅에서 알아내기 힘듦.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; TCP 는 아직 동기 스레드</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      FastAPI async 위에서 동기 소켓을 돌리고 있음. <code>asyncio.to_thread</code> 로 일단 감싸 쓰지만, 세션 로직 안에서 여러 번 블로킹 호출이 있음.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 모니터링 포맷</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      health-detail JSON blob &rarr; SQLite 에 그대로 저장. 시계열 분석/알람 조건 작성이 수동. 추세 파악이 약함.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 벤더 락인</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      JAKA 전제의 코드가 <code>services/robot/</code> 전반에 퍼져 있음. 새 로봇(UR, Doosan 등) 을 꽂으려면 추상 인터페이스부터 분리 필요.
    </div>
  </div>

</div></div>

---

## 개선 방향 — 다음 1년

이 시리즈의 후속 9편이 각각 이 항목들을 구체화합니다.

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2.1;">
    <span style="color:#58a6ff; font-weight: 700;">1.</span> <strong>RobotClient 추상화 + 모킹 컨트롤러</strong> — 벤더 독립 인터페이스. 테스트용 fake 로봇 서버 (#02) <br/>
    <span style="color:#f0883e; font-weight: 700;">2.</span> <strong>프로토콜 명세 문서화</strong> — 명령 카탈로그와 에러코드 표 (#02) <br/>
    <span style="color:#3fb950; font-weight: 700;">3.</span> <strong>벡터화 파이프라인 평가 프레임</strong> — 스타일별 품질 자동 비교 (#03) <br/>
    <span style="color:#d2a8ff; font-weight: 700;">4.</span> <strong>A4 좌표계 일반화</strong> — 동적 캔버스 + dry-run 시뮬레이터 (#04) <br/>
    <span style="color:#f778ba; font-weight: 700;">5.</span> <strong>AI 드로잉 로컬 모델 병행</strong> — 비용과 주권, 프롬프트 템플릿 표준화 (#05) <br/>
    <span style="color:#58a6ff; font-weight: 700;">6.</span> <strong>비전 기반 펜 캘리브레이션</strong> — 스크린 접촉 검출 자동화 개선 (#06) <br/>
    <span style="color:#f0883e; font-weight: 700;">7.</span> <strong>async 전환 + SSE 진행률</strong> — 세션 로직을 이벤트 루프로 (#07) <br/>
    <span style="color:#3fb950; font-weight: 700;">8.</span> <strong>Prometheus / OpenTelemetry</strong> — 모니터링 포맷 표준화 (#08) <br/>
    <span style="color:#d2a8ff; font-weight: 700;">9.</span> <strong>Flutter 오프라인 모드 강화</strong> — 서버 없어도 전체 플로우 (#09)
  </div>
</div></div>

---

## 다음 글

- [#01 — Android Java TcpClient → Python 마이그레이션: "동작 호환 우선" 전략](./2026-04-25-01-java-to-python-migration.md)
- [#02 — JAKA 컨트롤러 raw TCP/JSON 프로토콜 — SDK 가 아닌 이유](./2026-04-25-02-jaka-raw-tcp-protocol.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
