<script setup>
const posts = [
  { title: 'FastAPI 에러 처리 체계화 — 도메인별 예외 설계', tag: 'FastAPI', date: '2025.03.15' },
  { title: 'Docker Compose 멀티 서비스 구성 가이드', tag: 'Docker', date: '2025.03.10' },
  { title: 'OpenCV 이미지 벡터화 — 라인 추출에서 경로 최적화까지', tag: 'OpenCV', date: '2025.03.05' },
  { title: 'Tailscale VPN으로 현장 서버 원격 접근 구축하기', tag: 'Infra', date: '2025.02.28' },
  { title: 'Flutter Riverpod 상태관리 — Provider 패턴 정리', tag: 'Flutter', date: '2025.02.20' },
]

const domains = [
  { icon: '🌐', label: 'Web Fullstack' },
  { icon: '🤖', label: 'AI & Generative' },
  { icon: '🏥', label: 'Healthcare' },
  { icon: '🦾', label: 'Robot Systems' },
  { icon: '🛸', label: 'Drone IoT' },
]

const techStack = [
  { name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' },
  { name: 'FastAPI', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fastapi/fastapi-original.svg' },
  { name: 'Node.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg' },
  { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg' },
  { name: 'Vue', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vuejs/vuejs-original.svg' },
  { name: 'Flutter', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/flutter/flutter-original.svg' },
  { name: 'TypeScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg' },
  { name: 'Gemini', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg' },
  { name: 'OpenCV', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/opencv/opencv-original.svg' },
  { name: 'GAN', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pytorch/pytorch-original.svg' },
  { name: 'Docker', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg' },
  { name: 'Tailscale', icon: null, customSvg: 'tailscale' },
  { name: 'systemd', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg' },
  { name: 'IoT', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/raspberrypi/raspberrypi-original.svg' },
  { name: 'Robotics', icon: null, customSvg: 'robotics' },
  { name: 'SQLite', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlite/sqlite-original.svg' },
  { name: 'PostgreSQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg' },
  { name: 'Mapbox', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mapbox/mapbox-original.svg', style: 'filter: invert(1) grayscale(0.2);' },
  { name: 'GeoJSON', icon: null, customSvg: 'geojson' },
  { name: 'MQTT', icon: null, customSvg: 'mqtt' },
  { name: 'ROS2', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ros/ros-original.svg' },
  { name: 'Computer Vision', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/opencv/opencv-original.svg' },
]
</script>

<template>
  <div class="home-page">
    <div class="top-glow"></div>

    <nav class="nav">
      <div class="nav-logo"><span>J</span> Jin's Wiki</div>
      <a href="https://github.com/kimjinhyuk" target="_blank" class="nav-btn">View GitHub</a>
    </nav>

    <!-- ==================== HERO ==================== -->
    <section class="hero">
      <div class="hero-welcome">Welcome to</div>
      <div class="hero-title">Jin's Tech Blog</div>
      <div class="hero-role">Fullstack Engineer — AI & Software Systems Integration</div>
      <div class="hero-bio">AI와 하드웨어를 소프트웨어로 연결합니다</div>
      <div class="hero-socials">
        <a class="social-btn glass" href="https://github.com/kimjinhyuk" target="_blank" title="GitHub">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
        <a class="social-btn glass" href="https://www.linkedin.com/in/kimjinhyuk2/" target="_blank" title="LinkedIn">
          <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
        <a class="social-btn glass" href="mailto:contact@jinhyuk.kim" title="Email">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>
        </a>
      </div>
      <div class="hero-deco"></div>
    </section>

    <!-- Domains -->
    <div class="domains">
      <div v-for="domain in domains" :key="domain.label" class="domain-card glass">
        <div class="domain-icon">{{ domain.icon }}</div>
        <div class="domain-label">{{ domain.label }}</div>
      </div>
    </div>

    <!-- Posts -->
    <div class="section-divider"><span>Recent Posts</span></div>
    <section class="section">
      <div v-for="post in posts" :key="post.title" class="post-item glass">
        <span class="post-title">{{ post.title }}</span>
        <div class="post-meta">
          <span class="post-tag">{{ post.tag }}</span>
          <span class="post-date">{{ post.date }}</span>
        </div>
      </div>
    </section>

    <!-- Tech Stack -->
    <div class="section-divider"><span>Tech Stack</span></div>
    <section class="section">
      <div class="stack-grid">
        <div v-for="tech in techStack" :key="tech.name" class="stack-item glass">
          <div class="stack-icon">
            <!-- Tailscale custom SVG -->
            <svg v-if="tech.customSvg === 'tailscale'" viewBox="0 0 24 24" width="32" height="32">
              <circle cx="4.5" cy="4.5" r="2.2" fill="#242f3e"/>
              <circle cx="12" cy="4.5" r="2.2" fill="#242f3e"/>
              <circle cx="19.5" cy="4.5" r="2.2" fill="#242f3e"/>
              <circle cx="4.5" cy="12" r="2.2" fill="#5d6e81"/>
              <circle cx="12" cy="12" r="2.2" fill="#5d6e81"/>
              <circle cx="19.5" cy="12" r="2.2" fill="#5d6e81"/>
              <circle cx="4.5" cy="19.5" r="2.2" fill="#9aaab9"/>
              <circle cx="12" cy="19.5" r="2.2" fill="#9aaab9"/>
              <circle cx="19.5" cy="19.5" r="2.2" fill="#9aaab9"/>
            </svg>
            <!-- Robotics custom SVG -->
            <svg v-else-if="tech.customSvg === 'robotics'" viewBox="0 0 64 64" width="32" height="32">
              <path d="M32 8 L48 24 L48 48 L40 56 L40 48 L36 44 L36 56 L28 56 L28 44 L24 48 L24 56 L16 48 L16 24 Z" fill="none" stroke="#8a9cc8" stroke-width="3" stroke-linejoin="round"/>
              <circle cx="32" cy="20" r="3" fill="#8a9cc8"/>
              <path d="M12 28 L16 24" stroke="#8a9cc8" stroke-width="3" stroke-linecap="round"/>
              <path d="M52 28 L48 24" stroke="#8a9cc8" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <!-- GeoJSON custom SVG -->
            <svg v-else-if="tech.customSvg === 'geojson'" viewBox="0 0 24 24" width="32" height="32" fill="#3bb2d0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
            </svg>
            <!-- MQTT custom SVG -->
            <svg v-else-if="tech.customSvg === 'mqtt'" viewBox="0 0 24 24" width="32" height="32" fill="#660066">
              <path d="M12 2L2 9l10 7 10-7-10-7zM2 17l10 7 10-7M2 12l10 7 10-7"/>
            </svg>
            <!-- Regular icon from CDN -->
            <img v-else :src="tech.icon" :alt="tech.name" :style="tech.style || ''">
          </div>
          <div class="stack-label">{{ tech.name }}</div>
        </div>
      </div>
    </section>

    <!-- Projects -->
    <div class="section-divider"><span>Projects</span></div>
    <section class="section">
      <div class="project-card glass-strong">
        <div class="project-header">
          <span class="project-name">DRP — Drawing Robot Platform</span>
          <span class="project-status">진행중</span>
        </div>
        <div class="project-desc">사진을 AI로 라인드로잉으로 변환하고 산업용 로봇팔이 실시간으로 그림을 그리는 시스템. 전국 다수 현장에 배포된 로봇들의 원격 모니터링 플랫폼.</div>
        <div class="project-tags">
          <span>FastAPI</span><span>Flutter</span><span>Gemini AI</span><span>OpenCV</span><span>Docker</span><span>JAKA Robot</span>
        </div>
      </div>
    </section>

    <!-- About -->
    <div class="section-divider"><span>About</span></div>
    <section class="section">
      <div class="about-card glass-strong">
        <div class="about-heading">Who I Am</div>
        <div class="about-text">
          <strong>8년차 풀스택 엔지니어.</strong><br/>
          웹 풀스택 개발을 기반으로, 인공지능 콘텐츠 개발(GAN, 생성형 이미지 모델),<br/>
          헬스케어, 드론 IoT, 로봇 시스템까지 —<br/>
          소프트웨어가 물리적 세계와 만나는 영역에서 일합니다.
        </div>
        <div class="about-interests">
          <span>Physical AI</span>
          <span>Robotics</span>
          <span>Web Development</span>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <div class="section-divider"><span>Contact</span></div>
    <section class="section contact-section">
      <div class="contact-title">Let's connect.</div>
      <div class="contact-sub">프로젝트 협업, 기술 문의 환영합니다</div>
      <div class="contact-links">
        <a href="https://github.com/kimjinhyuk" target="_blank" class="contact-link glass">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
        <a href="https://www.linkedin.com/in/kimjinhyuk2/" target="_blank" class="contact-link glass">
          <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
        <a href="mailto:contact@jinhyuk.kim" class="contact-link glass">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>
          contact@jinhyuk.kim
        </a>
      </div>
    </section>

    <footer class="page-footer">
      <div class="footer-text">Bye</div>
      <div class="footer-copy">Do Visit Again — &copy; 2025 Jin</div>
    </footer>
  </div>
</template>
