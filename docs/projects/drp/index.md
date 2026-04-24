# DRP — Drawing Robot Platform

> AI 기반 드로잉 로봇 통합 관리 시스템 — 사진을 AI 로 라인드로잉으로 변환하고, 산업용 로봇팔이 실시간으로 그림을 그리는 시스템. 전국 다수 현장에 배포된 로봇들의 상태를 원격으로 모니터링하고 관리하는 플랫폼.

---

## 시리즈 컨셉

각 글은 일관된 4 섹션 구조로 구성됩니다.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
  <div style="border: 1px solid #58a6ff; border-radius: 10px; padding: 14px; background: #0c2d6b;">
    <div style="color: #58a6ff; font-weight: 700; font-size: 13px;">1. TL;DR</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.6;">한눈에 핵심을 잡는 요약 카드</div>
  </div>
  <div style="border: 1px solid #5a3600; border-radius: 10px; padding: 14px; background: #1c1206;">
    <div style="color: #f0883e; font-weight: 700; font-size: 13px;">2. 현재 설계 / 구현</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.6;">코드와 다이어그램으로 지금의 모습</div>
  </div>
  <div style="border: 1px solid #5a1c1c; border-radius: 10px; padding: 14px; background: #2a0f0f;">
    <div style="color: #f85149; font-weight: 700; font-size: 13px;">3. 한계</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.6;">솔직한 약점, 운영하며 알게 된 것들</div>
  </div>
  <div style="border: 1px solid #1a5c2e; border-radius: 10px; padding: 14px; background: #04260f;">
    <div style="color: #3fb950; font-weight: 700; font-size: 13px;">4. 개선 방향</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.6;">다음 1년 안에 시도해볼 것들</div>
  </div>
</div></div>

이 시리즈 전체가 **DRP 시스템을 다음 단계로 끌어올리는 연구 노트** 역할을 합니다. 10편 모두 완결되면 각 글의 "개선 방향" 섹션을 모아 차기 로드맵을 만들 계획입니다.

---

## 시리즈 목차

<div style="padding: 12px 0;"><div style="display: grid; grid-template-columns: 1fr; gap: 10px;">

  <a href="./2026-04-25-00-system-overview-adr" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #0c2d6b; border: 1px solid #58a6ff; display: flex; align-items: center; justify-content: center; color: #58a6ff; font-weight: 700; font-size: 13px;">#00</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">시스템 전체 개요와 아키텍처 결정 기록 (ADR)</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">왜 모노레포 · FastAPI · SQLite · Flutter · raw TCP · 직접 TCP 단일 모드를 선택했는가</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-25-01-java-to-python-migration" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #1c1206; border: 1px solid #f0883e; display: flex; align-items: center; justify-content: center; color: #f0883e; font-weight: 700; font-size: 13px;">#01</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">Android Java TcpClient → Python 마이그레이션: "동작 호환 우선" 전략</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">명령 · 파라미터 · 타이밍을 1:1 로 옮긴 이유와 단계적 개선 로드맵</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-25-02-jaka-raw-tcp-protocol" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #1a0e30; border: 1px solid #d2a8ff; display: flex; align-items: center; justify-content: center; color: #d2a8ff; font-weight: 700; font-size: 13px;">#02</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">JAKA 컨트롤러 raw TCP/JSON 프로토콜 — SDK 가 아닌 이유</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">port 10001 · line-based JSON · errorCode · 명령 카탈로그 · 모킹 컨트롤러</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-25-03-image-to-robot-pipeline" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #1c1206; border: 1px solid #f0883e; display: flex; align-items: center; justify-content: center; color: #f0883e; font-weight: 700; font-size: 13px;">#03</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">이미지 → 벡터 → 로봇 명령 풀 파이프라인</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">4단계 fallback 벡터화 · Douglas-Peucker · NN+2-opt 경로 정렬 · dry-run 로드맵</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-25-04-a4-safe-coordinate-system" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #04260f; border: 1px solid #3fb950; display: flex; align-items: center; justify-content: center; color: #3fb950; font-weight: 700; font-size: 13px;">#04</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">A4 안전 좌표계 — 픽셀, mm, 그리고 클램핑</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">Java 원본 공식 보존 · 3층 방어(소프트/하드/펌웨어) · Canvas 추상화 로드맵</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-25-05-ai-line-drawing-gemini" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #1a0e30; border: 1px solid #d2a8ff; display: flex; align-items: center; justify-content: center; color: #d2a8ff; font-weight: 700; font-size: 13px;">#05</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">AI 라인 드로잉 (Gemini 2.5 Flash Image)</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">4가지 스타일 프롬프트 · 프롬프트 템플릿화 · 로컬 SD+ControlNet 파일럿</div>
      </div>
    </div>
  </a>

  <div style="border: 1px dashed #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px; opacity: 0.55;">
    <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #161b22; border: 1px solid #30363d; display: flex; align-items: center; justify-content: center; color: #484f58; font-weight: 700; font-size: 13px;">#06</div>
    <div style="flex: 1;">
      <div style="color: #8b949e; font-weight: 600; font-size: 14px;">펜 자동 캘리브레이션 <span style="font-size:11px; background:#1c1206; color:#f0883e; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">예정</span></div>
      <div style="color: #484f58; font-size: 12px; margin-top: 4px;">스크린 접촉점 자동 측정 · 비전 기반 보정</div>
    </div>
  </div>

  <div style="border: 1px dashed #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px; opacity: 0.55;">
    <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #161b22; border: 1px solid #30363d; display: flex; align-items: center; justify-content: center; color: #484f58; font-weight: 700; font-size: 13px;">#07</div>
    <div style="flex: 1;">
      <div style="color: #8b949e; font-weight: 600; font-size: 14px;">백그라운드 세션 관리 + Gentle Stop <span style="font-size:11px; background:#1c1206; color:#f0883e; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">예정</span></div>
      <div style="color: #484f58; font-size: 12px; margin-top: 4px;">스레드 lifecycle · "전원 유지하되 동작만 멈춤" · SSE 진행률</div>
    </div>
  </div>

  <div style="border: 1px dashed #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px; opacity: 0.55;">
    <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #161b22; border: 1px solid #30363d; display: flex; align-items: center; justify-content: center; color: #484f58; font-weight: 700; font-size: 13px;">#08</div>
    <div style="flex: 1;">
      <div style="color: #8b949e; font-weight: 600; font-size: 14px;">현장 서버 pull-model 모니터링 + heartbeat 버퍼링 <span style="font-size:11px; background:#1c1206; color:#f0883e; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">예정</span></div>
      <div style="color: #484f58; font-size: 12px; margin-top: 4px;">on-demand check + push heartbeat · Tailscale · Prometheus 로 진화</div>
    </div>
  </div>

  <div style="border: 1px dashed #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px; opacity: 0.55;">
    <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #161b22; border: 1px solid #30363d; display: flex; align-items: center; justify-content: center; color: #484f58; font-weight: 700; font-size: 13px;">#09</div>
    <div style="flex: 1;">
      <div style="color: #8b949e; font-weight: 600; font-size: 14px;">Flutter 앱 아키텍처 + 모노레포 운영 + 회고와 다음 단계 <span style="font-size:11px; background:#1c1206; color:#f0883e; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">예정</span></div>
      <div style="color: #484f58; font-size: 12px; margin-top: 4px;">Riverpod 4-layer · 다국어 · 오프라인 드로잉 모드 · 차기 로드맵 종합</div>
    </div>
  </div>

</div></div>

---

## 시스템 한눈에 보기

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

---

## Tech Stack

| Layer | 기술 |
|---|---|
| **Backend** | Python 3.10+ · FastAPI · Pydantic v2 · uv · OpenCV · scikit-image · Google Gemini 2.5 Flash Image |
| **Frontend** | Flutter 3.22 · Dart · Riverpod 2 · Android / iOS 태블릿 |
| **Monitoring** | FastAPI (별도 서비스) · SQLite · Tailscale VPN · Slack Webhook · Notion API |
| **Infra / DevOps** | Git Subtree 모노레포 · Docker & Docker Compose · systemd · MinIO (S3 호환) |
| **Robot** | JAKA 6축 로봇팔 · raw TCP/JSON 프로토콜 (port 10001) |

---

<!-- TODO: 추후 추가 예정 -->
<!-- - 로봇 드로잉 동작 영상 -->
<!-- - 태블릿 앱 UI 스크린샷 -->

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
