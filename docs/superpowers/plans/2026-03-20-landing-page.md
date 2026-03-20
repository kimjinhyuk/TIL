# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default VitePress home layout with a custom glassmorphism dark landing page featuring hero, blog posts, tech stack, projects, about, and contact sections.

**Architecture:** Create a VitePress custom theme that extends the default theme. The home page uses a full custom Vue component (`HomePage.vue`) while inner pages (projects, blog posts) keep the default VitePress layout. CSS is scoped to the home page via a wrapper class.

**Tech Stack:** VitePress 1.6.4, Vue 3 (SFC), CSS (no preprocessor), Inter font (Google Fonts CDN), devicon CDN for tech logos, custom SVGs for Tailscale/GeoJSON/MQTT/Robotics.

**Spec:** `docs/superpowers/specs/2026-03-20-landing-page-design.md`
**Mockup:** `.superpowers/brainstorm/56198-1773997599/landing-mockup-v4.html`

---

## File Structure

```
docs/.vitepress/
├── theme/
│   ├── index.js              # Theme entry — extends default, registers HomePage
│   ├── components/
│   │   └── HomePage.vue      # Full custom landing page component
│   └── home.css              # Home-page-only styles (glass, grid, glow, animations)
├── config.js                 # No changes needed
└── components/
    └── Comment.vue           # Existing, untouched
docs/
├── index.md                  # Change frontmatter to use custom layout
└── ...                       # All other pages untouched
```

---

### Task 1: Create VitePress custom theme entry

**Files:**
- Create: `docs/.vitepress/theme/index.js`

- [ ] **Step 1: Create theme directory**

```bash
mkdir -p docs/.vitepress/theme/components
```

- [ ] **Step 2: Write theme entry file**

`docs/.vitepress/theme/index.js`:
```js
import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import './home.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
  }
}
```

- [ ] **Step 3: Verify build still works**

Run: `bun run docs:build`
Expected: Build succeeds (HomePage.vue doesn't exist yet but component registration won't error until it's used)

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/index.js
git commit -m "feat: add custom theme entry extending default VitePress theme"
```

---

### Task 2: Create home page CSS

**Files:**
- Create: `docs/.vitepress/theme/home.css`

- [ ] **Step 1: Write the home page CSS**

Port all styles from the approved mockup (`landing-mockup-v4.html`) into `docs/.vitepress/theme/home.css`. All selectors must be scoped under `.home-page` wrapper to avoid affecting inner pages.

Key sections to include:
- `.home-page` base styles (background, font-family, color)
- Background grid (`::before` pseudo-element on `.home-page`)
- Top glow (`.top-glow`)
- Glass classes (`.glass`, `.glass-strong`)
- Nav (`.custom-nav`)
- Hero (`.hero`, `.hero-title`, `.hero-welcome`, `.hero-role`, `.hero-bio`, `.hero-socials`, `.social-btn`, `.hero-deco`)
- Domain cards (`.domains`, `.domain-card`)
- Section divider (`.section-divider`)
- Posts (`.post-item`, `.post-title`, `.post-meta`, `.post-tag`, `.post-date`)
- Tech stack grid (`.stack-grid`, `.stack-item`, `.stack-icon`, `.stack-label`)
- Project card (`.project-card`)
- About card (`.about-card`)
- Contact (`.contact-section`, `.contact-title`, `.contact-link`)
- Footer (`.custom-footer`)
- Animations (`@keyframes fadeInUp`, `@keyframes blink`)
- VitePress override: hide default nav/footer when `.home-page` is present

VitePress nav/footer override:
```css
/* Hide VitePress default chrome on home page */
.home-page ~ .VPNav,
body:has(.home-page) .VPNav,
body:has(.home-page) .VPFooter,
body:has(.home-page) .VPContent > .VPPage > .container { display: none; }
```

Google Fonts import at the top:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap');
```

- [ ] **Step 2: Verify build**

Run: `bun run docs:build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/home.css
git commit -m "feat: add glassmorphism CSS for custom landing page"
```

---

### Task 3: Create HomePage.vue component — structure and hero

**Files:**
- Create: `docs/.vitepress/theme/components/HomePage.vue`

- [ ] **Step 1: Write the Vue component with all sections**

Port the entire HTML structure from `landing-mockup-v4.html` into a Vue SFC. Use `<template>` for markup, `<script setup>` for data arrays (posts, techStack, projects). No `<style>` block — all styles come from `home.css`.

Data arrays to define in `<script setup>`:

```js
const posts = [
  { title: 'FastAPI 에러 처리 체계화 — 도메인별 예외 설계', tag: 'FastAPI', date: '2025.03.15', link: '#' },
  { title: 'Docker Compose 멀티 서비스 구성 가이드', tag: 'Docker', date: '2025.03.10', link: '#' },
  { title: 'OpenCV 이미지 벡터화 — 라인 추출에서 경로 최적화까지', tag: 'OpenCV', date: '2025.03.05', link: '#' },
  { title: 'Tailscale VPN으로 현장 서버 원격 접근 구축하기', tag: 'Infra', date: '2025.02.28', link: '#' },
  { title: 'Flutter Riverpod 상태관리 — Provider 패턴 정리', tag: 'Flutter', date: '2025.02.20', link: '#' },
]

const domains = [
  { icon: '🌐', label: 'Web Fullstack' },
  { icon: '🤖', label: 'AI & Generative' },
  { icon: '🏥', label: 'Healthcare' },
  { icon: '🦾', label: 'Robot Systems' },
  { icon: '🛸', label: 'Drone IoT' },
]
```

Tech stack array: 22 items, each with `{ label, logo, type }` where type is `'devicon'`, `'devicon-invert'`, or `'svg'` (inline SVG string for Tailscale, GeoJSON, MQTT, Robotics).

Template structure (all wrapped in `<div class="home-page">`):
1. `<div class="top-glow" />`
2. Nav section
3. Hero section (title, role, bio, socials)
4. Domain cards (v-for)
5. Section divider "Recent Posts" + post list (v-for)
6. Section divider "Tech Stack" + grid (v-for)
7. Section divider "Projects" + DRP card
8. Section divider "About" + about card
9. Section divider "Contact" + contact links
10. Footer

SVG icons for GitHub, LinkedIn, Email — inline in template.

- [ ] **Step 2: Verify build**

Run: `bun run docs:build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/HomePage.vue
git commit -m "feat: add HomePage.vue with all landing page sections"
```

---

### Task 4: Update index.md to use HomePage component

**Files:**
- Modify: `docs/index.md`

- [ ] **Step 1: Replace index.md content**

```md
---
layout: page
title: Home
---

<script setup>
import HomePage from './.vitepress/theme/components/HomePage.vue'
</script>

<HomePage />
```

- [ ] **Step 2: Verify local dev server**

Run: `bun run docs:dev`
Open: `http://localhost:4000`
Expected: Custom landing page renders with all sections, glassmorphism effects, and animations. No VitePress default nav visible on home page.

- [ ] **Step 3: Verify inner pages still work**

Open: `http://localhost:4000/projects/drp`
Expected: Default VitePress layout with nav, sidebar, and content. No custom landing page styles leaking.

- [ ] **Step 4: Verify production build**

Run: `bun run docs:build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add docs/index.md
git commit -m "feat: wire up custom landing page in index.md"
```

---

### Task 5: Visual QA and fixes

**Files:**
- Modify: `docs/.vitepress/theme/home.css` (if needed)
- Modify: `docs/.vitepress/theme/components/HomePage.vue` (if needed)

- [ ] **Step 1: Check responsive behavior**

Open dev server at various widths:
- Desktop (1200px+): all sections full width
- Tablet (768px): domain cards wrap, stack grid adapts
- Mobile (375px): single column, font sizes readable

Fix any overflow or layout issues.

- [ ] **Step 2: Check all tech stack logos load**

Scroll to Tech Stack section. Verify all 22 icons render:
- devicon logos: Python, FastAPI, Node.js, React, Vue, Flutter, TypeScript, Gemini(Google), OpenCV, GAN(PyTorch), Docker, systemd(Linux), IoT(Raspberry Pi), ROS2, Computer Vision(OpenCV), SQLite, PostgreSQL, Mapbox(inverted)
- Custom SVGs: Tailscale (3x3 dots), GeoJSON (map pin), MQTT (layers), Robotics (robot arm)

- [ ] **Step 3: Check hover effects**

Verify all interactive elements have proper hover states:
- Social buttons: translateY + glow
- Domain cards: translateY + glow shadow
- Post items: translateX
- Stack items: translateY
- Project card: translateY + shadow
- Contact links: translateY + glow

- [ ] **Step 4: Check VitePress default nav is hidden on home only**

- Home page: NO VitePress nav bar visible
- `/projects/README`: VitePress nav IS visible
- `/projects/drp`: VitePress nav IS visible with sidebar

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: visual QA fixes for landing page"
```

---

### Task 6: Final build and deploy

**Files:** None (deployment only)

- [ ] **Step 1: Final production build**

Run: `bun run docs:build`
Expected: Clean build, no warnings

- [ ] **Step 2: Push to remote**

```bash
git push origin main
```

Expected: Vercel auto-deploys, landing page live at blog.jinhyuk.kim

- [ ] **Step 3: Verify live site**

Open the production URL and check:
- Landing page renders correctly
- All sections visible
- Inner pages still work
- No console errors
