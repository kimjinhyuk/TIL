# 사내 ERP 를 FastAPI + Next.js + 온프레미스 LLM 으로 만들면서 — 스택 선택의 이유

> 본 글은 팀에서 함께 진행 중인 사내 그룹웨어/ERP 프로젝트의 설계·운영 경험을 일반화해 정리한 것입니다. 구체적 수치·이름·경로는 공개 가능한 수준으로 치환했습니다.

---

## Tech Stack

<div style="padding: 20px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #2d1a04; padding: 8px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">Backend</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      FastAPI &middot; SQLModel &middot; Alembic &middot; uvicorn &middot; pydantic v2
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 8px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">Frontend</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      Next.js 15 (App Router) &middot; shadcn/ui &middot; TailwindCSS 4 &middot; TanStack Query &middot; Zustand &middot; bun
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 8px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">DB / Search</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      PostgreSQL 16 &middot; pgvector &middot; pg_trgm &middot; HNSW + GIN &middot; RRF
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 8px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">LLM</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      llama.cpp &middot; 온프레미스 GPU &middot; 오픈웨이트 모델 &middot; bge-m3 임베딩
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 8px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 13px;">Infra / DevOps</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      Docker Compose &middot; Gitea Actions self-hosted runner &middot; nginx (TLS 종단)
    </div>
  </div>

</div></div>

---

## 시스템 아키텍처

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 14px;">

  <div style="border: 2px solid #58a6ff; border-radius: 10px; padding: 12px 32px; background: linear-gradient(135deg, #1f3a5f, #1a2744); text-align: center;">
    <span style="color: #58a6ff; font-weight: 700; font-size: 15px;">&#127760; 웹 브라우저 / 사내망</span>
  </div>
  <div style="color: #484f58; font-size: 22px;">&#x25BC;<span style="color:#8b949e; font-size:12px; margin-left: 10px;">HTTPS</span></div>

  <div style="width: 100%; max-width: 720px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c0f33; padding: 10px 14px; text-align: center;">
      <span style="color: #d2a8ff; font-weight: 700;">nginx</span>
      <span style="color: #8b949e; font-size: 12px; margin-left: 8px;">TLS 종단 + 리버스 프록시</span>
    </div>
  </div>
  <div style="color: #484f58; font-size: 22px;">&#x25BC; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#x25BC;</div>

  <div style="display: flex; gap: 14px; width: 100%; max-width: 720px; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 240px; border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
      <div style="background: #04260f; padding: 10px 14px; text-align: center;">
        <span style="color: #3fb950; font-weight: 700;">Next.js 15</span>
        <span style="color: #8b949e; font-size: 12px; display: block; margin-top: 2px;">Standalone build &middot; App Router</span>
      </div>
    </div>
    <div style="flex: 1; min-width: 240px; border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
      <div style="background: #1c1206; padding: 10px 14px; text-align: center;">
        <span style="color: #f0883e; font-weight: 700;">FastAPI</span>
        <span style="color: #8b949e; font-size: 12px; display: block; margin-top: 2px;">uvicorn &middot; async I/O &middot; SSE</span>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 22px;">&#x25BC;</div>

  <div style="display: flex; gap: 12px; width: 100%; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 200px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
      <div style="background: #0c2d6b; padding: 10px 14px; text-align: center;">
        <span style="color: #58a6ff; font-weight: 700;">&#128190; PostgreSQL</span>
        <span style="color: #8b949e; font-size: 12px; display: block; margin-top: 2px;">+ pgvector + pg_trgm</span>
      </div>
    </div>
    <div style="flex: 1; min-width: 200px; border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
      <div style="background: #1a0e30; padding: 10px 14px; text-align: center;">
        <span style="color: #d2a8ff; font-weight: 700;">&#129302; llama.cpp</span>
        <span style="color: #8b949e; font-size: 12px; display: block; margin-top: 2px;">온프레미스 GPU</span>
      </div>
    </div>
    <div style="flex: 1; min-width: 200px; border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
      <div style="background: #2a0f1f; padding: 10px 14px; text-align: center;">
        <span style="color: #f778ba; font-weight: 700;">&#128193; 파일 스토리지</span>
        <span style="color: #8b949e; font-size: 12px; display: block; margin-top: 2px;">로컬 볼륨</span>
      </div>
    </div>
  </div>

</div></div>

전부 Docker Compose 한 묶음으로 돌아가고, 자동 배포는 Git 저장소(Gitea) 의 Actions 가 self-hosted runner 로 처리한다.

---

## 왜 SaaS 가 아니고 자체 개발인가

많은 회사가 슬랙 + 노션 + 구글워크스페이스 + 외부 결재 SaaS 조합으로 "그룹웨어" 를 구성한다. 우리도 한참 그랬다. 하지만 다음 세 가지가 점점 커졌다.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#128274; 외부 저장 부담</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      결재 문서, 거래처 정보, 인사 데이터까지 외부 SaaS 에 맡겨야 하는 점이 <strong>규제·감사 관점에서 지속적으로 이슈</strong>.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#128279; 모듈 간 통합 마찰</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      결재 &rarr; 발주 &rarr; 재고 &rarr; 프로젝트 원가로 이어지는 흐름을 <strong>서로 다른 SaaS 로 끌고 가면 매번 수동 복붙</strong>.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#128181; 비용 구조</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      직원 수만큼 <strong>seat 비용이 선형 증가</strong>. 자체 운영 시 하드웨어/운영 인건비로 평탄화 가능.
    </div>
  </div>

</div></div>

그래서 **핵심 업무 흐름은 자체 운영하되, 운영 부담은 최소화**하는 스택을 골랐다. 이 글은 그 선택들을 되돌아보는 기록이다.

---

## 왜 FastAPI?

- **SQLModel + Alembic 조합** — pydantic 으로 스키마 검증, SQLAlchemy 로 쿼리, Alembic 으로 마이그레이션이 **하나의 모델 정의**에서 파생된다.
- **async 기본** — LLM 스트리밍(SSE), 외부 API 호출, DB I/O 가 섞이는 워크로드라 동기 프레임워크였다면 워커 스레드 튜닝으로 피 봤을 자리다.
- **OpenAPI 자동 생성** — 프론트 TypeScript 타입을 반자동 동기화.

<div style="padding: 12px 0;"><div style="border-left: 3px solid #f0883e; background: #1c1206; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#f0883e;">트레이드오프</strong> &mdash; async 이벤트 루프 관리 복잡도. <code>asyncio.to_thread</code> 로 감싸야 하는 동기 호출(임베딩 인퍼런스, 이미지 프로세싱 등) 을 놓치면 <strong>한 사용자가 모두의 응답을 막는</strong> 버그가 생긴다. 이걸 처음 찾았을 때 "동기 라이브러리 호출 목록" 을 아예 코드 리뷰 체크리스트에 넣었다.
</div></div>

---

## 왜 Next.js 15 (App Router)?

- shadcn/ui + TailwindCSS 4 로 빠르게 일관된 UI 구축
- TanStack Query 로 서버 상태, Zustand 로 클라이언트 상태 분리
- App Router 의 서버 컴포넌트로 초기 페이로드 감소
- Next.js Standalone 빌드 → 컨테이너 이미지 작고 단순

패키지 매니저는 `bun` 으로 바꿨다. `npm install` 이 분 단위 걸리던 작업이 초 단위가 됐다. 호환성 이슈는 타입 정의 경로 하나 정도만 수동 해결.

---

## 왜 온프레미스 GPU LLM?

사내 챗봇·검색·요약에 LLM 을 쓰려는데 외부 API 는 세 가지가 걸렸다.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2a0f0f, #1a0606); padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">외부 API</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      &times; 사내 문서 본문이 외부로 나감 (정책 위반)<br/>
      &times; 사용량 증가 시 비용 예측 어려움<br/>
      &times; 레이트 리밋·가용성을 외부에 의존
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #0a2117, #04260f); padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">온프레미스 GPU</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      &check; 데이터가 사내 네트워크 밖으로 안 나감<br/>
      &check; 한 번 사 두면 추론 비용 평탄화<br/>
      &check; 가용성을 자체 운영으로 통제
    </div>
  </div>

</div></div>

그래서 **llama.cpp + 로컬 GPU + 오픈웨이트 모델** 조합으로 구성했다. Docker Compose 에 NVIDIA GPU 디바이스를 예약해서 그대로 띄운다.

```yaml
llm:
  image: ghcr.io/ggml-org/llama.cpp:server
  command: >
    --host 0.0.0.0 --port 8080
    --model /models/gemma-4-e2b-it-Q4_K_M.gguf
    --ctx-size 16384 --parallel 4 --cont-batching
    --n-gpu-layers -1
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    start_period: 180s   # GPU 로딩 3분까지 허용
```

소규모 모델로도 단순 요약·RAG·티켓 분류는 충분하다. 더 어려운 작업(장문 생성) 은 아직 모델 업그레이드를 고민하는 중.

검색은 **pgvector + trigram 하이브리드 + RRF** 로 PostgreSQL 안에서 해결한다. 별도 벡터 DB 안 띄운다 ([별도 글](./2026-04-24-pgvector-hybrid-search.md) 로 따로 정리했다).

---

## Docker Compose 두 벌 운영

`docker-compose.dev.yml` 과 `docker-compose.prod.yml` 을 분리했다.

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d;">
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-weight: 600;">항목</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12px; font-weight: 700;">dev</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 12px; font-weight: 700;">prod</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">DB 포트</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">로컬 루프백 매핑</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">사내망 바인딩</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">백엔드</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">볼륨 마운트 + 핫 리로드</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;">빌드 후 고정 이미지</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">워커 수</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;"><code>--workers 1</code></div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;"><code>--workers 2</code></div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">DB 이미지</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 13px;"><code>pgvector/pgvector:pg16</code></div>
    <div style="padding: 10px 14px; color: #f85149; font-size: 13px;">한 번 <code>postgres:16-alpine</code> &rarr; pgvector 통일</div>
  </div>
</div></div>

마지막 줄이 한 번 우리 발등을 찍었는데, 그 얘기는 뒤에 운영 교훈에서.

---

## 자동 배포 — Gitea Actions + self-hosted runner

GitHub Actions 문법 호환의 Gitea Actions 를 쓴다. main 브랜치 push 시 self-hosted runner 가 서버에서 다음 흐름을 돌린다.

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
  <div style="width: 100%; max-width: 600px; border: 1px solid #58a6ff; border-radius: 8px; padding: 10px 14px; background: #0c2d6b; text-align: center; color: #58a6ff; font-size: 13px; font-weight: 600;">git push origin main</div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="width: 100%; max-width: 600px; border: 1px solid #d2a8ff; border-radius: 8px; padding: 10px 14px; background: #1a0e30; text-align: center; color: #d2a8ff; font-size: 13px; font-weight: 600;">Gitea Actions trigger &middot; self-hosted runner 픽업</div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; max-width: 600px;">
    <div style="border: 1px solid #5a3600; border-radius: 8px; padding: 10px; background: #1c1206; text-align: center; color: #f0883e; font-size: 12.5px; font-weight: 600;">git fetch + reset</div>
    <div style="border: 1px solid #1a5c2e; border-radius: 8px; padding: 10px; background: #04260f; text-align: center; color: #3fb950; font-size: 12.5px; font-weight: 600;">docker compose build</div>
    <div style="border: 1px solid #3d2266; border-radius: 8px; padding: 10px; background: #1a0e30; text-align: center; color: #d2a8ff; font-size: 12.5px; font-weight: 600;">alembic upgrade head</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>
  <div style="border: 2px solid #f778ba; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #2a0f1f, #1a0a14); text-align: center;">
    <span style="color: #f778ba; font-weight: 700;">&#128640; 운영 환경 반영</span>
  </div>
</div></div>

```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - name: Pull latest code
        run: |
          git fetch origin main
          git reset --hard origin/main
      - name: Build and restart
        run: docker compose -f docker-compose.prod.yml up -d --build backend frontend
      - name: Run migrations
        run: docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
```

단순하지만 충분하다. 장점은 **배포 대상 서버가 곧 runner** 라 네트워크/권한 설계가 하나로 끝난다는 것.

---

## 운영에서 배운 것들

하루 동안 이 파이프라인에서 세 번 실패했다. 각각 다른 레이어에서 터졌는데 전부 "당연한 가정" 이 깨진 케이스였다.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr; gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">1. Alembic multi-head</span>
      <span style="color: #8b949e; font-size: 11px;">DB 마이그레이션</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      여러 기능 브랜치가 같은 시점에서 새 마이그레이션을 만들고 각자 머지되면 <strong>head 가 두 개</strong>인 상태로 운영에 들어간다. 해결은 빈 merge revision 추가, 예방은 PR 머지 전 CI 에 <code>alembic heads</code> 한 줄 체크.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">2. dev / prod 이미지 드리프트</span>
      <span style="color: #8b949e; font-size: 11px;">Docker Compose</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      dev compose 의 DB 이미지를 pgvector 내장본으로 바꾸는 커밋은 머지했지만 <strong>prod compose 에는 반영이 빠졌다</strong>. <code>CREATE EXTENSION vector</code> 가 prod 에서 터짐. 교훈: 공통 부분은 <strong>YAML anchor 또는 override 패턴</strong>으로 묶기.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">3. Runner 프로세스 env 오염</span>
      <span style="color: #8b949e; font-size: 11px;">CI / DevOps</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      self-hosted runner 를 VSCode Remote 세션에서 수동 기동하면 <code>VSCODE_GIT_*</code> 가 박제되어 세션 종료 후에도 죽은 소켓을 가리킨다. 이 얘기는 <a href="./2026-04-24-gitea-runner-vscode-env-til.md" style="color:#d2a8ff; text-decoration: underline;">별도 TIL</a> 로 따로 정리했다.
    </div>
  </div>

</div></div>

셋 다 공통점은 **"로컬에서는 잘 되는데" 현상의 본질**. 운영 환경의 드리프트·프로세스 상태·동시성이 로컬과 달라서 생긴다.

---

## 지금 생각하는 개선 방향

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px 18px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <span style="color:#3fb950; font-weight: 700;">&check;</span> CI 에 <code>alembic heads</code> 체크 추가 — 머지 전 멀티헤드 조기 감지<br/>
    <span style="color:#3fb950; font-weight: 700;">&check;</span> dev/prod compose 의 공통 베이스 추출 — 이미지/헬스체크 드리프트 방지<br/>
    <span style="color:#3fb950; font-weight: 700;">&check;</span> Runner 를 systemd user service 로 전환 — env 오염 재발 방지<br/>
    <span style="color:#3fb950; font-weight: 700;">&check;</span> Monitoring 스택 (Grafana + Loki) — 현재는 <code>docker logs</code> 로 수동 추적 중
  </div>
</div></div>

---

## 정리

자체 개발의 가장 큰 비용은 **운영**이다. 기능 개발보다 "내가 쓰는 추상화가 어디서 새는지" 를 이해하는 데 더 많은 시간이 간다. 대신 운영을 이해한 만큼 시스템에 대한 통제감이 생기고, SaaS 에서는 결코 안 해 줄 맞춤 기능을 한두 시간 만에 붙일 수 있다.

완벽하지 않지만 돌아가고, 돌아가면서 배우는 중이다.

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
