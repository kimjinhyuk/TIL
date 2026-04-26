# MRC — 협동로봇 통합 플랫폼

> Hardware-agnostic 개방형 AI 네이티브 협동로봇 플랫폼. 노드 기반 비주얼 에디터 위에서 이기종 협동로봇을 같은 인터페이스로 제어하고, ROS2 와 AI 오케스트레이션을 한 레이어로 묶는 것을 목표로 하는 프로젝트입니다.

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
    <div style="color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.6;">솔직한 약점, 통합하며 알게 된 것들</div>
  </div>
  <div style="border: 1px solid #1a5c2e; border-radius: 10px; padding: 14px; background: #04260f;">
    <div style="color: #3fb950; font-weight: 700; font-size: 13px;">4. 개선 방향</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.6;">다음 단계로 가져갈 설계 방향</div>
  </div>
</div></div>

이 시리즈는 **MRC 를 MVP 에서 본격 플랫폼으로 끌어올리는 연구 노트** 역할을 합니다. 6개 협동로봇 브랜드(글에서는 A · B · C · D · E · F사 로 표기) 의 SDK 를 단일 API 로 묶으면서 마주친 결정과 실패, 그리고 다음 시즌의 ROS2 + AI 오케스트레이션 구상까지 차례로 정리합니다.

---

## 시리즈 목차

<div style="padding: 12px 0;"><div style="display: grid; grid-template-columns: 1fr; gap: 10px;">

  <a href="./2026-04-26-00-system-overview-adr" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #0c2d6b; border: 1px solid #58a6ff; display: flex; align-items: center; justify-content: center; color: #58a6ff; font-weight: 700; font-size: 13px;">#00</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">시스템 전체 개요와 아키텍처 결정 기록 (ADR)</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">왜 모노레포 · FastAPI · Redis · React Flow · ABC 어댑터 · 단일 라우팅 컨트롤러를 선택했는가</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-26-01-multi-vendor-architecture" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #1c1206; border: 1px solid #f0883e; display: flex; align-items: center; justify-content: center; color: #f0883e; font-weight: 700; font-size: 13px;">#01</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">멀티벤더 협동로봇 통합 아키텍처 — Core ABC + 어댑터 패턴</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">전원·활성화 절차 불일치, 공통 인터페이스 매핑, 인스턴스 싱글톤화, 클라이언트 제한 대응</div>
      </div>
    </div>
  </a>

  <a href="./2026-04-26-02-python-version-isolation" style="text-decoration: none; color: inherit;">
    <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117; display: flex; align-items: center; gap: 14px;">
      <div style="min-width: 44px; height: 44px; border-radius: 50%; background: #1a0e30; border: 1px solid #d2a8ff; display: flex; align-items: center; justify-content: center; color: #d2a8ff; font-weight: 700; font-size: 13px;">#02</div>
      <div style="flex: 1;">
        <div style="color: #e6edf3; font-weight: 600; font-size: 14px;">Python 버전 지옥 — 3.5 전용 SDK 와 3.10+ 메인 서버 공존시키기</div>
        <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">venv 격리 · Docker 컨테이너 · IPC 브리지 3가지 옵션 비교 · 점진 통합 전략</div>
      </div>
    </div>
  </a>

</div></div>

> 다음 묶음(#03–) 에서는 C++ SDK pybind11 바인딩, RPC 누수와 싱글톤화, 시뮬레이터 네트워크 구축, ROS2 + AI 오케스트레이션 로드맵 등을 차례로 다룰 계획입니다.

---

## 시스템 한눈에 보기

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
  <div style="width: 100%; border: 2px solid #58a6ff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 12px 20px; text-align: center;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 16px;">MRC Platform</span>
      <span style="color: #8b949e; font-size: 13px; display: block;">노드형 비주얼 에디터 · 단일 API · 멀티벤더</span>
    </div>
    <div style="display: flex; gap: 0;">
      <div style="flex: 1; padding: 16px; text-align: center; border-right: 1px solid #30363d; background: #161b22;">
        <div style="font-size: 20px;">&#129513;</div>
        <div style="color: #f0883e; font-weight: 600; font-size: 14px;">React Flow Editor</div>
        <div style="color: #8b949e; font-size: 12px;">Tailwind · Shadcn/UI</div>
      </div>
      <div style="flex: 1; padding: 16px; text-align: center; border-right: 1px solid #30363d; background: #161b22;">
        <div style="font-size: 20px;">&#9881;</div>
        <div style="color: #3fb950; font-weight: 600; font-size: 14px;">Unified Controller</div>
        <div style="color: #8b949e; font-size: 12px;">FastAPI · uv</div>
      </div>
      <div style="flex: 1; padding: 16px; text-align: center; background: #161b22;">
        <div style="font-size: 20px;">&#129302;</div>
        <div style="color: #d2a8ff; font-weight: 600; font-size: 14px;">Robot Adapters</div>
        <div style="color: #8b949e; font-size: 12px;">A · B · C · D · E · F사</div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 24px; line-height: 1;">&#x25BC;</div>
  <div style="display: flex; gap: 12px; width: 100%;">
    <div style="flex: 1; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
      <div style="background: #2d1a04; padding: 10px; text-align: center; font-weight: 600; color: #f0883e; font-size: 14px;">Frontend (Node Editor)</div>
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #0d1117;">
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">React + React Flow</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">Tailwind + Shadcn/UI</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 12px;">노드 → 동작 시퀀스 변환</div>
      </div>
    </div>
    <div style="flex: 1; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
      <div style="background: #0a2117; padding: 10px; text-align: center; font-weight: 600; color: #3fb950; font-size: 14px;">Backend (Unified API)</div>
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #0d1117;">
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 12px;">FastAPI 라우팅</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 12px;">JWT 토큰 + IP 라우팅</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 12px;">Core ABC 어댑터 호출</div>
      </div>
    </div>
    <div style="flex: 1; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
      <div style="background: #1c0f33; padding: 10px; text-align: center; font-weight: 600; color: #d2a8ff; font-size: 14px;">State / Cache</div>
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #0d1117;">
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">Redis</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">로그인 컨텍스트</div>
        <div style="text-align: center; color: #484f58;">&#x25BC;</div>
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">동작 시퀀스 영속화</div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 24px; line-height: 1;">&#x25BC;</div>
  <div style="width: 100%; border: 2px solid #f778ba; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2a0f1f, #1a0a14); padding: 12px 20px; text-align: center;">
      <span style="color: #f778ba; font-weight: 700; font-size: 15px;">6개 벤더 협동로봇</span>
      <span style="color: #8b949e; font-size: 12px; display: block;">각 SDK 를 어댑터로 흡수 · 단일 인터페이스 노출</span>
    </div>
    <div style="display: flex; gap: 0;">
      <div style="flex: 1; padding: 12px; text-align: center; border-right: 1px solid #30363d; background: #161b22; color: #f778ba; font-size: 12px; font-weight: 600;">A사</div>
      <div style="flex: 1; padding: 12px; text-align: center; border-right: 1px solid #30363d; background: #161b22; color: #f778ba; font-size: 12px; font-weight: 600;">B사</div>
      <div style="flex: 1; padding: 12px; text-align: center; border-right: 1px solid #30363d; background: #161b22; color: #f778ba; font-size: 12px; font-weight: 600;">C사</div>
      <div style="flex: 1; padding: 12px; text-align: center; border-right: 1px solid #30363d; background: #161b22; color: #f778ba; font-size: 12px; font-weight: 600;">D사</div>
      <div style="flex: 1; padding: 12px; text-align: center; border-right: 1px solid #30363d; background: #161b22; color: #f778ba; font-size: 12px; font-weight: 600;">E사</div>
      <div style="flex: 1; padding: 12px; text-align: center; background: #161b22; color: #f778ba; font-size: 12px; font-weight: 600;">F사</div>
    </div>
  </div>
</div></div>

---

## Tech Stack

| Layer | 기술 |
|---|---|
| **Frontend** | React · React Flow (노드 기반 비주얼 에디터) · TailwindCSS · Shadcn/UI |
| **Backend** | Python · FastAPI · uv (의존성/가상환경) · Pydantic |
| **State / Cache** | Redis (세션 컨텍스트 · 동작 시퀀스 임시 저장) |
| **Adapters** | 6개 벤더(A · B · C · D · E · F사) 협동로봇 SDK 래핑 — 일부는 `pybind11` 로 C++ 바인딩 |
| **Future** | ROS2 (TCP/UDP 실시간성 분리) · AI 네이티브 오케스트레이션 계층 · 모드버스/IO TCP 라우터 |

---

## 프로젝트의 위치

- **컨셉**: N8N · Make · Zapier 가 SaaS 자동화 영역에서 보여준 "노드 기반 + 노코드" 경험을, **이기종 협동로봇 제어** 영역에 가져온다.
- **하드웨어 중립**: 특정 벤더에 종속되지 않고, 새 로봇이 들어와도 같은 노드/같은 API 로 제어할 수 있게 추상화.
- **AI 네이티브**: 단순 매크로가 아니라, 로봇 동작을 LLM/Agent 가 계획하고 실행할 수 있는 오케스트레이션 계층을 향한다.

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
