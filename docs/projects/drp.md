# DRP (Drawing Robot Platform)

> AI 기반 드로잉 로봇 통합 관리 시스템

사진을 AI로 라인드로잉으로 변환하고, 산업용 로봇팔이 실시간으로 그림을 그리는 시스템.
전국 다수 현장에 배포된 로봇들의 상태를 원격으로 모니터링하고 관리하는 플랫폼.

---

## Tech Stack

### Backend
- **Python 3.10+**, FastAPI, Pydantic v2
- **OpenCV**, NumPy, scikit-image (이미지 처리/벡터화)
- **Google Gemini 2.5 Flash** (AI 라인드로잉 변환)
- SQLite, MinIO (S3 호환 스토리지)
- Docker, Docker Compose

### Frontend
- **Flutter 3.19** (Dart), Riverpod 상태관리
- Android / iOS 크로스플랫폼 태블릿 앱

### Monitoring
- FastAPI (별도 서비스), SQLite
- **Tailscale VPN** (현장 원격 접근)
- Slack Webhook, Notion API (알림/이력 기록)

### Infra / DevOps
- Git Subtree 모노레포 구성
- systemd 자동 시작, Docker 컨테이너 오케스트레이션

---

## 핵심 기능

### AI 드로잉 파이프라인
- 사진 → AI 라인드로잉 변환 (4가지 스타일: `minimal`, `western`, `asian`, `modern`)
- 이미지 벡터화 → 경로 최적화 → 로봇 명령 자동 생성

### 로봇 제어
- **JAKA 로봇팔** 실시간 TCP 제어 (드로잉 세션 관리)
- 펜 자동 캘리브레이션 (스크린 접촉점 자동 측정)

### 운영 관리
- 현장 서버 원격 모니터링 (5개 서브시스템 헬스체크)
- 온디맨드 Pull 방식 상태 조회 (Tailscale VPN 경유)
- Slack 실시간 알림 + Notion 이력 기록
- 드로잉 히스토리 / 대시보드 통계

---

## 시스템 아키텍처

### 전체 구조

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
  <div style="width: 100%; border: 2px solid #58a6ff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 12px 20px; text-align: center;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 16px;">DRP Monorepo</span>
      <span style="color: #8b949e; font-size: 13px; display: block;">Git Subtree 통합 관리</span>
    </div>
    <div style="display: flex; gap: 0;">
      <div style="flex: 1; padding: 16px; text-align: center; border-right: 1px solid #30363d; background: #161b22;">
        <div style="font-size: 20px;">&#9881;</div>
        <div style="color: #f0883e; font-weight: 600; font-size: 14px;">Drawing API</div>
        <div style="color: #8b949e; font-size: 12px;">FastAPI</div>
      </div>
      <div style="flex: 1; padding: 16px; text-align: center; border-right: 1px solid #30363d; background: #161b22;">
        <div style="font-size: 20px;">&#128241;</div>
        <div style="color: #3fb950; font-weight: 600; font-size: 14px;">Flutter App</div>
        <div style="color: #8b949e; font-size: 12px;">Tablet</div>
      </div>
      <div style="flex: 1; padding: 16px; text-align: center; background: #161b22;">
        <div style="font-size: 20px;">&#128225;</div>
        <div style="color: #d2a8ff; font-weight: 600; font-size: 14px;">Monitoring API</div>
        <div style="color: #8b949e; font-size: 12px;">FastAPI</div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 24px; line-height: 1;">&#x25BC; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#x25BC; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#x25BC;</div>
  <div style="display: flex; gap: 12px; width: 100%;">
    <div style="flex: 1; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
      <div style="background: #2d1a04; padding: 10px; text-align: center; font-weight: 600; color: #f0883e; font-size: 14px;">AI Pipeline</div>
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #0d1117;">
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">Gemini 2.5 Flash</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">OpenCV 벡터화</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">경로 최적화</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">로봇 명령 생성</div>
      </div>
    </div>
    <div style="flex: 1; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
      <div style="background: #0a2117; padding: 10px; text-align: center; font-weight: 600; color: #3fb950; font-size: 14px;">Tablet App</div>
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #0d1117;">
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 12px;">Riverpod 상태관리</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 12px;">REST API 호출</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 12px;">드로잉 UI</div>
      </div>
    </div>
    <div style="flex: 1; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
      <div style="background: #1c0f33; padding: 10px; text-align: center; font-weight: 600; color: #d2a8ff; font-size: 14px;">Monitoring</div>
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #0d1117;">
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">Tailscale VPN</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="display: flex; gap: 4px;">
          <div style="flex:1; background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 6px 4px; text-align: center; color: #d2a8ff; font-size: 11px;">현장 A</div>
          <div style="flex:1; background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 6px 4px; text-align: center; color: #d2a8ff; font-size: 11px;">현장 B</div>
          <div style="flex:1; background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 6px 4px; text-align: center; color: #d2a8ff; font-size: 11px;">현장 C</div>
        </div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="display: flex; gap: 4px;">
          <div style="flex:1; background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 6px 4px; text-align: center; color: #d2a8ff; font-size: 11px;">Slack</div>
          <div style="flex:1; background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 6px 4px; text-align: center; color: #d2a8ff; font-size: 11px;">Notion</div>
        </div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 24px; line-height: 1;">&#x25BC;</div>
  <div style="border: 2px solid #f778ba; border-radius: 10px; padding: 16px 40px; background: linear-gradient(135deg, #2a0f1f, #1a0a14); text-align: center;">
    <div style="font-size: 28px;">&#129302;</div>
    <div style="color: #f778ba; font-weight: 700; font-size: 15px;">JAKA 로봇팔</div>
    <div style="color: #8b949e; font-size: 12px;">TCP 실시간 제어 &middot; 드로잉 실행</div>
  </div>
</div></div>

### AI 드로잉 파이프라인

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 480px; margin: 0 auto;">
  <div style="border: 2px dashed #58a6ff; border-radius: 10px; padding: 12px 32px; background: #0d1117; text-align: center;">
    <span style="color: #58a6ff; font-weight: 600;">&#128247; 사진 입력</span>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="width: 100%; position: relative;">
    <div style="border: 1px solid #f0883e; border-radius: 8px; padding: 14px; background: #1c1206; text-align: center;">
      <div style="color: #f0883e; font-weight: 600;">Google Gemini 2.5 Flash</div>
      <div style="color: #8b949e; font-size: 12px;">AI 라인드로잉 변환</div>
      <div style="display: flex; gap: 6px; justify-content: center; margin-top: 8px; flex-wrap: wrap;">
        <span style="background: #2d1a04; border: 1px solid #5a3600; border-radius: 4px; padding: 2px 10px; color: #f0883e; font-size: 11px;">minimal</span>
        <span style="background: #2d1a04; border: 1px solid #5a3600; border-radius: 4px; padding: 2px 10px; color: #f0883e; font-size: 11px;">western</span>
        <span style="background: #2d1a04; border: 1px solid #5a3600; border-radius: 4px; padding: 2px 10px; color: #f0883e; font-size: 11px;">asian</span>
        <span style="background: #2d1a04; border: 1px solid #5a3600; border-radius: 4px; padding: 2px 10px; color: #f0883e; font-size: 11px;">modern</span>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="width: 100%; border: 1px solid #3fb950; border-radius: 8px; padding: 12px; background: #04260f; text-align: center;">
    <div style="color: #3fb950; font-weight: 600;">OpenCV + scikit-image</div>
    <div style="color: #8b949e; font-size: 12px;">이미지 벡터화</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="width: 100%; border: 1px solid #d2a8ff; border-radius: 8px; padding: 12px; background: #1a0e30; text-align: center;">
    <div style="color: #d2a8ff; font-weight: 600;">경로 최적화</div>
    <div style="color: #8b949e; font-size: 12px;">TSP 알고리즘</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="width: 100%; border: 1px solid #58a6ff; border-radius: 8px; padding: 12px; background: #0c2d6b; text-align: center;">
    <div style="color: #58a6ff; font-weight: 600;">로봇 명령 생성</div>
    <div style="color: #8b949e; font-size: 12px;">좌표 변환</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="border: 2px solid #f778ba; border-radius: 10px; padding: 14px 32px; background: linear-gradient(135deg, #2a0f1f, #1a0a14); text-align: center;">
    <span style="color: #f778ba; font-weight: 700;">&#129302; JAKA 로봇팔 &mdash; 드로잉 실행</span>
  </div>
</div></div>

### 모노레포 구조

<div style="padding: 20px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117; max-width: 620px; margin: 0 auto;">
  <div style="background: #161b22; padding: 10px 16px; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 16px;">&#128193;</span>
    <span style="color: #e6edf3; font-weight: 600;">drp/</span>
  </div>
  <div style="padding: 0 16px;">
    <div style="padding: 10px 0; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 8px;">
      <span style="color: #f0883e; font-size: 14px;">&#128194;</span>
      <span style="color: #f0883e; font-weight: 600; font-size: 14px;">drawing-api/</span>
      <span style="color: #8b949e; font-size: 12px; margin-left: auto;">드로잉 백엔드 (FastAPI)</span>
    </div>
    <div style="padding-left: 24px; color: #8b949e; font-size: 13px; line-height: 2;">
      models/ &middot; config/ &middot; router/ &middot; exceptions/ &middot; tests/
    </div>
  </div>
  <div style="padding: 0 16px;">
    <div style="padding: 10px 0; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 8px;">
      <span style="color: #3fb950; font-size: 14px;">&#128194;</span>
      <span style="color: #3fb950; font-weight: 600; font-size: 14px;">flutter-app/</span>
      <span style="color: #8b949e; font-size: 12px; margin-left: auto;">태블릿 앱 (Flutter)</span>
    </div>
    <div style="padding-left: 24px; color: #8b949e; font-size: 13px; line-height: 2;">
      providers/ &middot; screens/ &middot; services/
    </div>
  </div>
  <div style="padding: 0 16px;">
    <div style="padding: 10px 0; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 8px;">
      <span style="color: #d2a8ff; font-size: 14px;">&#128194;</span>
      <span style="color: #d2a8ff; font-weight: 600; font-size: 14px;">monitoring-api/</span>
      <span style="color: #8b949e; font-size: 12px; margin-left: auto;">모니터링 서비스 (FastAPI)</span>
    </div>
    <div style="padding-left: 24px; color: #8b949e; font-size: 13px; line-height: 2;">
      health_check/ &middot; alerts/ &middot; dashboard/
    </div>
  </div>
  <div style="padding: 0 16px;">
    <div style="padding: 10px 0; display: flex; align-items: center; gap: 8px;">
      <span style="color: #8b949e; font-size: 14px;">&#128196;</span>
      <span style="color: #8b949e; font-size: 13px;">docker-compose.yml &middot; systemd/</span>
      <span style="color: #484f58; font-size: 12px; margin-left: auto;">인프라 설정</span>
    </div>
  </div>
</div></div>

### 특징
- 모노레포 통합 (Git 히스토리 보존, 3개 서비스)
- 도메인별 모듈 분리 (`models`, `config`, `router`, `exceptions`)
- 구조적 JSON 로깅 + 현장 식별자(Site ID) 체계
- **72개 자동화 테스트**

---

## 어필 포인트

| 역량 | 근거 |
|------|------|
| **풀스택 설계** | FastAPI 백엔드 + Flutter 프론트 + 모니터링 서비스 — 3개 시스템 설계/구현 |
| **AI 활용** | Google Gemini API + OpenCV 이미지 처리 파이프라인 |
| **하드웨어 연동** | 산업용 로봇팔 TCP 직접 제어, 좌표 변환, 캘리브레이션 |
| **운영 경험** | 전국 다수 현장 배포, 원격 모니터링, 장애 대응 체계 |
| **리팩토링** | 레거시 → 모노레포 + 모듈 분리 + 에러 체계화 + 테스트 |
| **DevOps** | Docker, Tailscale VPN, systemd, 자동 배포 파이프라인 |

---

<!-- TODO: 추후 추가 예정 -->
<!-- - 로봇 드로잉 동작 영상 -->
<!-- - 태블릿 앱 UI 스크린샷 -->

<script setup>
  import Comment from '../.vitepress/components/Comment.vue'
</script>
<Comment />
