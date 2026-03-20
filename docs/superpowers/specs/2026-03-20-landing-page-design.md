# Landing Page Redesign — Design Spec

## Overview

기존 VitePress 기본 `home` 레이아웃을 커스텀 랜딩 페이지로 교체한다.
기술 블로그 중심의 포트폴리오 하이브리드 사이트로, 미니멀 다크 톤에 글래스모피즘과 타이포그래피 글로우를 적용한다.

## Design Decisions

- **사이트 성격:** 기술 블로그 메인 + 프로젝트 쇼케이스 서브
- **비주얼 톤:** 미니멀/클린 다크 (#060a15 베이스)
- **레이아웃:** 블로그 퍼스트 — 글 목록이 가장 큰 비중
- **디자인 요소:** 글래스모피즘 카드, 그래디언트 타이포, 배경 그리드+글로우

## Sections (위→아래 순서)

### 1. Navigation
- 고정 상단 nav, 글래스 블러 배경
- 로고: "J Jin's Wiki"
- 우측: "View GitHub" 버튼

### 2. Hero
- "Welcome to" (13px, 대문자, 블루 계열)
- **"Jin's Tech Blog"** — 72px, font-weight 900, 흰→블루→퍼플 3색 그래디언트 + blur 글로우 레이어
- "Fullstack Engineer — AI & Software Systems Integration"
- "AI와 하드웨어를 소프트웨어로 연결합니다" + 타이핑 커서 애니메이션
- 소셜 아이콘 3개 (GitHub SVG, LinkedIn SVG, Email SVG) — 글래스 버튼
- fadeInUp 스태거 애니메이션

### 3. Domain Cards
- 5개 글래스 카드 가로 배치
- Web Fullstack, AI & Generative, Healthcare, Robot Systems, Drone IoT
- hover: translateY(-4px) + 글로우 쉐도우

### 4. Recent Posts (가장 큰 비중)
- `--- Recent Posts ---` 디바이더
- 글 목록 리스트 (글래스 카드)
- 각 항목: 제목 + 태그 배지 + 날짜
- hover: translateX(4px)
- **데이터 소스:** VitePress의 `createContentLoader` 또는 수동 목록

### 5. Tech Stack
- `--- Tech Stack ---` 디바이더
- 그리드 레이아웃 (auto-fill, 74px min)
- 실제 로고 사용 (devicon CDN + 커스텀 SVG)
- 기술 목록 (22개):
  - Python, FastAPI, Node.js, React, Vue, Flutter, TypeScript
  - Gemini, OpenCV, GAN(PyTorch), Docker, Tailscale, systemd
  - IoT(Raspberry Pi), Robotics(커스텀 로봇팔 SVG), SQLite
  - PostgreSQL, Mapbox, GeoJSON(커스텀 핀 SVG), MQTT(커스텀 SVG), ROS2, Computer Vision
- 글래스 카드, hover: translateY(-3px)
- Tailscale: 커스텀 3x3 도트 SVG, Mapbox: devicon + invert 필터

### 6. Projects
- `--- Projects ---` 디바이더
- glass-strong 카드 (blur 20px, 상단 그래디언트 라인)
- DRP 프로젝트: 제목, "진행중" 배지, 설명, 기술 태그

### 7. About
- `--- About ---` 디바이더
- glass-strong 카드, 중앙 정렬
- "WHO I AM" 라벨
- "8년차 풀스택 엔지니어" — 그래디언트 텍스트 strong
- 경력 서술: 웹 풀스택, AI(GAN, 생성형), 헬스케어, 드론 IoT, 로봇 시스템
- 관심분야 필 태그: Physical AI, Robotics, Web Development

### 8. Contact
- `--- Contact ---` 디바이더
- "Let's connect." — 36px 그래디언트 타이틀
- "프로젝트 협업, 기술 문의 환영합니다"
- 3개 글래스 링크: GitHub, LinkedIn, contact@jinhyuk.kim

### 9. Footer
- "Bye" / "Do Visit Again — © 2025 Jin"

## Visual System

### Colors
- Background: `#060a15`
- Grid lines: `rgba(80,120,255,0.025)`
- Glass base: `rgba(120,150,255,0.04)` / border `rgba(120,150,255,0.08)`
- Glass strong: `rgba(100,130,255,0.06)` / border `rgba(140,170,255,0.12)`
- Text primary: `#c8d1e0`
- Text secondary: `#5a6a8a`
- Accent: `rgba(120,150,255)` 계열

### Typography
- Font: Inter (Google Fonts CDN)
- Hero title: 72px / 900 weight / gradient + blur glow
- Section labels: 11px / uppercase / letter-spacing 3px
- Body: 14-16px / 400 weight

### Effects
- Top glow: `radial-gradient` 900x700px
- Grid: 60px 간격 미세 라인
- Glass: `backdrop-filter: blur(12-20px)` + inset highlight
- Animations: fadeInUp (0.8s, stagger), blink cursor
- Hover: translateY/X + box-shadow glow

### Section Dividers
- `--- Label ---` 패턴
- 좌우 `linear-gradient(transparent → accent → transparent)` 라인

## Implementation Approach

### VitePress Custom Theme

VitePress는 `docs/.vitepress/theme/index.js`를 자동 감지한다 (config.js 수정 불필요).

1. **`docs/.vitepress/theme/index.js`** — 기본 테마를 확장하고, `home` 레이아웃 슬롯을 오버라이드
2. **`docs/.vitepress/theme/components/HomePage.vue`** — 커스텀 랜딩 컴포넌트 (nav 포함)
3. **`docs/.vitepress/theme/style.css`** — 글로벌 CSS (글래스, 그리드, 글로우)

### index.md 처리
- `layout: page`로 변경하고, VitePress 기본 nav/footer를 CSS로 숨김 (홈 페이지에서만)
- `HomePage.vue`를 `<script setup>`으로 import해서 마크다운 내에서 렌더링
- 이렇게 하면 내부 페이지(projects/drp 등)에서는 기존 VitePress 테마가 그대로 유지됨

### Nav 처리
- 홈 페이지에서만 VitePress 기본 nav를 `display: none` 처리
- `HomePage.vue` 안에 커스텀 글래스 nav를 자체 포함
- 내부 페이지에서는 VitePress 기본 nav가 정상 표시됨

### config.js
- 변경 불필요. 기존 sidebar/nav 설정은 내부 페이지용으로 유지

### 데이터
- **Recent Posts: 하드코딩** (정적 배열). 기존 md 파일에 date/tag frontmatter가 없으므로 data loader는 부적합. 추후 블로그 글이 늘어나면 loader로 전환 가능.
- Tech Stack: 정적 배열
- Projects: 정적 배열

### Footer 연도
- `© 2026 Jin` (동적 연도는 불필요, 연초에 수동 업데이트)

### 외부 의존성
- Google Fonts: Inter
- devicon CDN: 테크 스택 로고
- 커스텀 SVG: Tailscale, GeoJSON, MQTT, Robotics

## Mockup Reference
- 최종 승인 목업: `.superpowers/brainstorm/56198-1773997599/landing-mockup-v4.html`
