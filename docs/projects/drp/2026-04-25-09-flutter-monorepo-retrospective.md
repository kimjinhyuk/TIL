# #09 — Flutter 앱 아키텍처 + 모노레포 운영 + 회고와 다음 단계

> **DRP Engineering Notes · Episode 09 (시리즈 마지막)** &middot; 시리즈의 마지막 글입니다. 클라이언트(Flutter) 의 아키텍처를 한 번 정리하고, 1 년 운영해 온 모노레포의 교훈을 적고, **이전 8 편의 "개선 방향"을 모아 차기 로드맵으로** 묶습니다. 이 글이 끝나면 — DRP 가 다음 단계로 가는 데 필요한 큰 그림이 한 자리에 있게 됩니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 14px 20px;">
    <span style="color: #f0883e; font-weight: 700; font-size: 15px;">시리즈 마무리</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#3fb950; font-weight: 700;">앱 구조</span> &nbsp;Flutter + Riverpod, <strong>features/ + shared/ + core/</strong> 3-레이어. 다국어 5개. 오프라인 드로잉 모드(JNI native)</div>
    <div><span style="color:#58a6ff; font-weight: 700;">모노레포</span> &nbsp;Git Subtree 로 backend/frontend/monitoring 통합. PR 한 번에 API+클라이언트 변경. 단점은 클론 용량/캐시 분리</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">회고</span> &nbsp;효과 본 것 / 안 통한 것 / 다음 시즌의 우선순위를 솔직하게</div>
    <div><span style="color:#f778ba; font-weight: 700;">로드맵</span> &nbsp;시리즈 #00~#08 의 개선 항목 25개 → 분기별 그룹으로 묶어 1 년 계획</div>
  </div>
</div></div>

---

## Part 1 — Flutter 앱 아키텍처

### 폴더 구조 — features 분리, shared 공유

```text
frontend/lib/
├── core/                    # 앱 공통 인프라
│   ├── constants/           #   상수 (URL, 색상, 키)
│   ├── network/             #   HTTP 클라이언트 베이스
│   └── routing/             #   GoRouter 설정
├── features/                # 기능별 모듈
│   ├── splash/              #   앱 진입
│   ├── main/                #   메인 카메라 화면
│   │   ├── providers/
│   │   └── views/
│   ├── history/             #   이전 드로잉 갤러리
│   ├── event/               #   이벤트 QR 스캔
│   └── offline/             #   오프라인 드로잉 모드
│       ├── providers/
│       ├── services/
│       ├── models/
│       ├── constants/
│       └── utils/
├── shared/                  # features 간 공유
│   ├── providers/           #   robot_session_provider 등
│   ├── services/            #   ai_image / camera / robot_api / log
│   ├── models/
│   └── widgets/
└── jni/                     # JNI native bridges
    └── potrace/             #   C 라이브러리 (오프라인 벡터화)
```

### 4-Layer Riverpod 패턴

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="width: 100%; max-width: 640px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;"><span style="color: #58a6ff; font-weight: 700;">Layer 1 &middot; View (ConsumerWidget)</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      화면 그리기만. <code>ref.watch()</code> 로 provider 구독. 비즈니스 로직 0.
    </div>
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;"><span style="color: #f0883e; font-weight: 700;">Layer 2 &middot; Provider (StateNotifier / Notifier)</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      상태 + 액션. View 의 사용자 입력을 받아 Service 호출. UI 에 노출할 모델로 가공.
    </div>
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;"><span style="color: #3fb950; font-weight: 700;">Layer 3 &middot; Service (비즈니스 로직 + I/O)</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      <code>robot_api_service</code> · <code>ai_image_service</code> · <code>camera_service</code> · <code>robot_session_polling_service</code> · <code>file_storage_service</code> · <code>log_service</code>. 외부와 대화하는 책임.
    </div>
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;"><span style="color: #d2a8ff; font-weight: 700;">Layer 4 &middot; External (Backend / Native / Storage)</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      FastAPI / S3 (presigned) / JNI native (potrace) / SharedPreferences / Camera plugin.
    </div>
  </div>

</div></div>

층 사이 의존은 항상 위 → 아래. View 가 직접 Service 를 호출하는 일도 없고, Service 가 Provider 의 상태를 알지도 않습니다.

### 핵심 features

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">main</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      카메라 프리뷰 + 가이드 라인 + 촬영. AI 변환 → 미리보기 → 그리기 시작 4-step UX.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">offline</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      서버 없을 때의 백업 흐름. <strong>JNI 네이티브 potrace</strong>로 앱 내 벡터화 → SVG 미리보기 → TCP 직통 드로잉.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">event</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      QR 스캔 → 백엔드로 배치 업로드. 현장 이벤트 참여 추적.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">history</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      이전 드로잉 갤러리. SQLite drawing_history 와 1:1 매핑.
    </div>
  </div>

</div></div>

### 오프라인 드로잉 모드 — JNI native potrace

서버가 닫혀도 앱이 단독으로 사진 → 로봇 명령까지 만들 수 있어야 했습니다. 그래서 <strong>Potrace C 라이브러리</strong> 를 JNI 로 묶고 Dart FFI 로 호출:

```text
Flutter UI
  └── OfflineDrawingProvider (Riverpod)
        └── OfflineVectorizeService
              └── Dart FFI binding
                    └── lib/jni/potrace/  (C 소스)
                          ├── trace.c
                          ├── decompose.c
                          ├── curve.c
                          └── backend_svg.c
```

오프라인 모드는 화질이 서버 모드만 못 합니다(Gemini 가 빠진 자리). 대신 **인터넷이 끊겨도 체험이 끊기지 않는** 게 가치. 현장 사고에서 한 번 살린 적 있는 안전망.

### 다국어 (5 언어)

<div style="padding: 12px 0;"><div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
  <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px; background: #0d1117; text-align: center;"><div style="color: #e6edf3; font-weight: 700;">ko</div><div style="color: #8b949e; font-size: 11px;">한국어</div></div>
  <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px; background: #0d1117; text-align: center;"><div style="color: #e6edf3; font-weight: 700;">en</div><div style="color: #8b949e; font-size: 11px;">English</div></div>
  <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px; background: #0d1117; text-align: center;"><div style="color: #e6edf3; font-weight: 700;">ja</div><div style="color: #8b949e; font-size: 11px;">日本語</div></div>
  <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px; background: #0d1117; text-align: center;"><div style="color: #e6edf3; font-weight: 700;">zh</div><div style="color: #8b949e; font-size: 11px;">中文</div></div>
  <div style="border: 1px solid #30363d; border-radius: 8px; padding: 10px; background: #0d1117; text-align: center;"><div style="color: #e6edf3; font-weight: 700;">vi</div><div style="color: #8b949e; font-size: 11px;">Tiếng Việt</div></div>
</div></div>

---

## Part 2 — 모노레포 운영 (Git Subtree)

### 통합 직전과 직후

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 13px;">Polyrepo (전)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      &times; 3 개 레포 각각 PR/리뷰<br/>
      &times; API 변경 + 앱 변경이 따로 배포돼 일시적 불일치<br/>
      &times; 버전 매트릭스 추적이 머리속<br/>
      &times; 신규 합류자 셋업이 3 단계
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">Monorepo (후)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      &check; PR 1 개로 API + 앱 + 모니터링 동시 변경<br/>
      &check; 태그 1 개 = 시스템 전체 버전<br/>
      &check; 셋업 = clone + docker compose up<br/>
      &check; 도큐먼트도 한 곳(<code>docs/</code>)
    </div>
  </div>

</div></div>

### Git Subtree 합치기 — 한 줄 명령으로

```bash
# 기존 backend 레포를 monorepo 의 backend/ 로 합치기 (히스토리 보존)
git subtree add --prefix=backend git@github.com:org/drp-backend.git main

# 이후엔 모노레포 안에서 일반 commit
git commit -m "feat(backend): ..."

# 필요 시 원래 레포로 다시 푸시 (선택)
git subtree push --prefix=backend git@github.com:org/drp-backend.git main
```

3 개 레포(`backend`, `frontend`, `monitoring`) 를 차례로 합쳐 단일 레포로. 히스토리는 모두 살아 있어 `git log -- backend/path/file.py` 가 그대로 동작.

### 모노레포가 만든 새 문제들

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">클론 용량</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      Flutter 빌드 산출물이 가끔 추적 → <code>.gitignore</code> 규율이 더 중요해짐.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">CI 매트릭스</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      Python / Flutter / Dart / C 빌드를 한 워크플로우에 묶어야. <strong>경로 필터</strong> 로 변경된 패키지만 빌드.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">버전 정합 책임 분산</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      한 PR 이 API 와 앱을 동시에 깨뜨릴 수도. <strong>OpenAPI 스펙 diff 자동 코멘트</strong> 같은 안전망 필요.
    </div>
  </div>

</div></div>

---

## Part 3 — 1 년 회고

### 통한 것 (Worth Repeating)

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&check; "동작 호환 우선" 마이그레이션</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Java → Python 1:1 보존(#01) 덕에 마이그레이션 직후에도 안정 운영. <em>"옮긴 다음에 개선"</em> 이 원칙으로 박힘.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&check; raw TCP 직통</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      SDK 의존성 0 (#02). Alpine 이미지 가능, 디버깅이 빠름. 향후 jaka-py 라이브러리 분리의 기반.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&check; SQLite 복수 인스턴스</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      파일 4개로 도메인 분리(#00). 백업이 cp 한 번. 1년 운영 동안 마이그레이션 사고 0.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&check; Gentle Stop</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "전원 유지하되 동작만 정지"(#07). 사용자 취소 후 재시작 시간 0. 가장 직관적인 UX 결정 중 하나.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&check; heartbeat 버퍼링</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>deque(1000)</code> + 다음 회차에 flush(#08). 인터넷 단절 흡수. 당연해 보이는데 만들어 두지 않았다면 로그 손실 빈번했을 것.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&check; 오프라인 드로잉 모드</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      JNI native potrace 로 서버 없이 동작. 한 번 현장에서 인터넷 끊겼을 때 안전망 역할.
    </div>
  </div>

</div></div>

### 안 통한 것 (Lessons Learned)

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&times; 게이트웨이 분리 (ADR-006)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "분리가 좋다" 는 일반론으로 도입했다 운영에서 한 홉 더 문제만 만듦. 직접 TCP 단일 모드로 회귀. <strong>"필요해지면 그때 분리"</strong> 가 옳았다.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&times; 로봇 없이 테스트 불가</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      가짜 컨트롤러를 일찌감치 만들었어야. CI 검증 공백이 1년 누적 → 차기 시즌 1순위.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&times; 프롬프트가 코드 상수</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Gemini 프롬프트 4 종류가 .py 파일 내부. 변경 = 배포. 운영 전환점에서 늦은 인지(#05).
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&times; 모니터링이 알림만</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      JSON blob 저장이 한계. 시계열 분석/추세 감지가 어려움. Prometheus 도입을 미루지 말 걸.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&times; dry-run 부재</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      벡터화 결과 / 좌표 변환 결과를 로봇 없이는 못 봄. "한 번 찍어봐야 안다" 가 누적 비용으로 큼.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&times; 폴링 기반 진행률</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      태블릿이 1~2초마다 GET. 다수 화면 동시 시 부하. SSE 로 갔어야.
    </div>
  </div>

</div></div>

---

## Part 4 — 차기 로드맵 (시리즈 #00~#08 종합)

각 글의 "개선 방향" 항목들을 모아, 1 년 안에 달성 가능한 묶음으로 분기별 정리합니다.

<div style="padding: 16px 0;"><div style="border: 1px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 12px 18px;">
    <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">Q1 — 기반 (Foundation)</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13px; line-height: 2;">
    <strong>FakeJakaController + 단위 테스트</strong> (#02) — 로봇 없이 회귀 가능<br/>
    <strong>RobotCommand 타입 안전 객체</strong> (#01) — f-string 제거<br/>
    <strong>Dry-run SVG/PNG 시뮬레이터</strong> (#03, #04) — 좌표/경로 시각 검증<br/>
    <strong>품질 평가 프레임 (SSIM/LPIPS 기반)</strong> (#03) — 파이프라인 변경 회귀 감지
  </div>
</div></div>

<div style="padding: 12px 0;"><div style="border: 1px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 12px 18px;">
    <span style="color: #f0883e; font-weight: 700; font-size: 14px;">Q2 — 관찰 + 자동화 (Observability + Automation)</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13px; line-height: 2;">
    <strong>Prometheus exporter + Grafana</strong> (#08) — 시계열 모니터링<br/>
    <strong>OpenTelemetry trace + Sentry</strong> (#08) — AI~로봇 end-to-end 추적<br/>
    <strong>SSE 진행률 스트림</strong> (#07) — 폴링 부하 제거<br/>
    <strong>알림 디바운스/그룹화</strong> (#08) — 노이즈 감소<br/>
    <strong>비전 기반 캘리브레이션 검증</strong> (#06) — "선이 잘 그어졌나" 자동 판정
  </div>
</div></div>

<div style="padding: 12px 0;"><div style="border: 1px solid #3fb950; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0a2117, #04260f); padding: 12px 18px;">
    <span style="color: #3fb950; font-weight: 700; font-size: 14px;">Q3 — 도메인 깊이 (Domain Depth)</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13px; line-height: 2;">
    <strong>moveC 로 실제 곡선 그리기</strong> (#03) — Bezier → 원호 명령<br/>
    <strong>Canvas 타입 추상화 + 3 점 평면 보정</strong> (#04, #06) — A3/이젤/기울어진 종이 지원<br/>
    <strong>프롬프트 템플릿 시스템 + 콘텐츠 해시 캐싱</strong> (#05) — 외부화 + 비용 절감<br/>
    <strong>로컬 SD + ControlNet 파일럿</strong> (#05) — 외부 API 의존 탈피
  </div>
</div></div>

<div style="padding: 12px 0;"><div style="border: 1px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 12px 18px;">
    <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">Q4 — 확장성 + 사용자 경험 (Scale + UX)</span>
  </div>
  <div style="background: #0d1117; padding: 14px 18px; color: #e6edf3; font-size: 13px; line-height: 2;">
    <strong>RobotClient 추상 인터페이스</strong> (#01, #02) — 비-JAKA 로봇 지원 기반<br/>
    <strong>jaka-py 라이브러리 분리</strong> (#02) — 사내 표준 스택<br/>
    <strong>세션 상태 영속화 + resume</strong> (#07) — 좀비 세션 / 이어 그리기<br/>
    <strong>자동 복구 액션 + 적응형 heartbeat</strong> (#08) — 자가 치유<br/>
    <strong>사용자 피드백 루프 + 품질 자동 등급</strong> (#05, #03) — 데이터 기반 개선 사이클
  </div>
</div></div>

---

## 시리즈 마무리

이 10 편을 쓰면서 가장 분명해진 것은 — **DRP 가 "잘 돌아가는 시스템" 이 된 이유는 화려한 기술이 아니었다** 는 점입니다.

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 18px 22px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 14px; line-height: 2;">
    &check; <strong>검증된 동작을 1:1 로 옮기고</strong> (#01)<br/>
    &check; <strong>외부 의존성을 가능한 0 으로 만들고</strong> (#02, #08)<br/>
    &check; <strong>물리적 안전을 코드에서 약속으로 박고</strong> (#04, #07)<br/>
    &check; <strong>"잘 모르는 것" 은 미루고, 운영하면서 배우고</strong> (#05, #06)<br/>
    &check; <strong>끊긴 동안 잃지 않게 만들고</strong> (#08)
  </div>
</div></div>

다음 1 년의 일은 — 위의 로드맵대로, **"본다 → 분석한다 → 자동으로 고친다"** 의 운영 단계로 끌어올리는 것. 그리고 시리즈를 다시 갱신합니다.

이 노트가 미래의 나에게(또는 같은 길을 가는 누군가에게) 말 거는 도구이길.

---

## 시리즈 전체 목차

- [#00 — 시스템 전체 개요와 아키텍처 결정 기록 (ADR)](./2026-04-25-00-system-overview-adr.md)
- [#01 — Android Java TcpClient → Python 마이그레이션: "동작 호환 우선" 전략](./2026-04-25-01-java-to-python-migration.md)
- [#02 — JAKA 컨트롤러 raw TCP/JSON 프로토콜 — SDK 가 아닌 이유](./2026-04-25-02-jaka-raw-tcp-protocol.md)
- [#03 — 이미지 → 벡터 → 로봇 명령 풀 파이프라인](./2026-04-25-03-image-to-robot-pipeline.md)
- [#04 — A4 안전 좌표계 — 픽셀, mm, 그리고 클램핑](./2026-04-25-04-a4-safe-coordinate-system.md)
- [#05 — AI 라인 드로잉 (Gemini 2.5 Flash Image)](./2026-04-25-05-ai-line-drawing-gemini.md)
- [#06 — 펜 자동 캘리브레이션](./2026-04-25-06-pen-auto-calibration.md)
- [#07 — 백그라운드 세션 관리 + Gentle Stop](./2026-04-25-07-background-session-gentle-stop.md)
- [#08 — 현장 서버 pull-model 모니터링 + heartbeat 버퍼링](./2026-04-25-08-pull-model-monitoring.md)
- **#09 — Flutter 앱 아키텍처 + 모노레포 운영 + 회고와 다음 단계 (현재 글)**

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
