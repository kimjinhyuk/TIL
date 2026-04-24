# 사내 ERP 를 FastAPI + Next.js + 온프레미스 LLM 으로 만들면서 — 스택 선택의 이유

> 본 글은 팀에서 함께 진행 중인 사내 그룹웨어/ERP 프로젝트의 설계·운영 경험을 일반화해 정리한 것입니다. 구체적 수치·이름·경로는 공개 가능한 수준으로 치환했습니다.

## 왜 SaaS 가 아니고 자체 개발인가

많은 회사가 슬랙 + 노션 + 구글워크스페이스 + 외부 결재 SaaS 조합으로 "그룹웨어" 를 구성한다. 우리도 한참 그랬다. 하지만 다음 세 가지가 점점 커졌다.

1. **업무 데이터 외부 저장 부담** — 결재 문서, 거래처 정보, 인사 데이터까지 전부 외부 SaaS 에 맡겨야 하는 점이 규제/감사 관점에서 지속적으로 이슈
2. **모듈 간 통합의 마찰** — 결재 → 발주 → 재고 → 프로젝트 원가로 이어지는 흐름을 서로 다른 SaaS 로 끌고 가면 매번 수동 복붙
3. **비용** — 직원 수만큼 seat 비용이 선형적으로 증가

그래서 **핵심 업무 흐름은 자체 운영하되, 운영 부담은 최소화**하는 스택을 골랐다. 이 글은 그 선택들을 되돌아보는 기록이다.

## 스택 한눈에 보기

```
 ┌────────────────────────────────────────────────────────┐
 │                     웹 브라우저                         │
 └───────────────────────┬────────────────────────────────┘
                         │ HTTPS
            ┌────────────▼────────────┐
            │ nginx (TLS 종단 + 프록시)│
            └────┬──────────────┬─────┘
                 │              │
        ┌────────▼──┐    ┌──────▼──────┐
        │ Next.js 15 │    │   FastAPI   │
        │ (Standalone)│    │  (uvicorn)  │
        └───────────┘    └──────┬──────┘
                                │
              ┌─────────────────┼────────────────────┐
              │                 │                    │
       ┌──────▼─────┐   ┌───────▼──────┐      ┌──────▼─────┐
       │ PostgreSQL │   │  llama.cpp   │      │ 파일 스토리지 │
       │ + pgvector │   │ (온프레 GPU)  │      │ (로컬 볼륨)  │
       └────────────┘   └──────────────┘      └────────────┘
```

전부 Docker Compose 한 묶음으로 돌아가고, 자동 배포는 Git 저장소(Gitea) 의 Actions 가 self-hosted runner 로 처리한다.

## 왜 FastAPI?

- **SQLModel + Alembic 조합** — pydantic 으로 스키마 검증, SQLAlchemy 로 쿼리, Alembic 으로 마이그레이션이 **하나의 모델 정의**에서 파생된다.
- **async 기본** — LLM 스트리밍(SSE), 외부 API 호출, DB I/O 가 섞이는 워크로드라 동기 프레임워크였다면 워커 스레드 튜닝으로 피 봤을 자리다.
- **OpenAPI 자동 생성** — 프론트 TypeScript 타입을 반자동 동기화.

트레이드오프는 async 이벤트 루프 관리 복잡도. `asyncio.to_thread` 로 감싸야 하는 동기 호출(임베딩 인퍼런스, 이미지 프로세싱 등) 을 놓치면 **한 사용자가 모두의 응답을 막는** 버그가 생긴다. 이걸 처음 찾았을 때 "동기 라이브러리 호출 목록" 을 아예 코드 리뷰 체크리스트에 넣었다.

## 왜 Next.js 15 (App Router)?

- shadcn/ui + TailwindCSS 4 로 빠르게 일관된 UI 구축
- TanStack Query 로 서버 상태, Zustand 로 클라이언트 상태 분리
- App Router 의 서버 컴포넌트로 초기 페이로드 감소
- Next.js Standalone 빌드 → 컨테이너 이미지 작고 단순

패키지 매니저는 `bun` 으로 바꿨다. `npm install` 이 분 단위 걸리던 작업이 초 단위가 됐다. 호환성 이슈는 타입 정의 경로 하나 정도만 수동 해결.

## 왜 온프레미스 GPU LLM?

사내 챗봇·검색·요약에 LLM 을 쓰려는데 외부 API 는 세 가지가 걸렸다.

- 사내 문서 본문이 외부로 나감 (정책상 불가)
- 사용량 증가 시 비용 예측 어려움
- 레이트 리밋·가용성을 외부에 의존

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

검색은 **pgvector + trigram 하이브리드 + RRF** 로 PostgreSQL 안에서 해결한다. 별도 벡터 DB 안 띄운다 (이 얘기는 [별도 글](./2026-04-24-pgvector-hybrid-search.md) 로 따로 정리했다).

## Docker Compose 두 벌 운영

`docker-compose.dev.yml` 과 `docker-compose.prod.yml` 을 분리했다. 주요 차이:

| 항목 | dev | prod |
|---|---|---|
| DB 포트 | 로컬 루프백 매핑 (접속 테스트용) | 사내망 바인딩 |
| 백엔드 | 볼륨 마운트로 핫 리로드 | 빌드 후 고정 |
| 워커 수 | `--workers 1` | `--workers 2` |
| DB 이미지 | `pgvector/pgvector:pg16` | 한 번은 `postgres:16-alpine` 이었다 이후 pgvector 로 통일 |

마지막 줄이 한 번 우리 발등을 찍었는데, 그 얘기는 뒤에 운영 교훈에서.

## 자동 배포 — Gitea Actions + self-hosted runner

GitHub Actions 문법 호환의 Gitea Actions 를 쓴다. main 브랜치 push 시 self-hosted runner 가 서버에서 `git fetch` → `docker compose up -d --build` → `alembic upgrade head` 를 돌린다.

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

## 운영에서 배운 것들

하루 동안 이 파이프라인에서 세 번 실패했다. 각각 다른 레이어에서 터졌는데 전부 "당연한 가정" 이 깨진 케이스였다.

### 1) Alembic multi-head

여러 기능 브랜치가 같은 시점에서 새 마이그레이션을 만들고 각자 머지되면 **head 가 두 개인 상태**로 운영에 들어간다. `alembic upgrade head` 가:

```
Multiple head revisions are present for given argument 'head'
```

하고 멈춘다. 해결은 빈 merge revision 하나 추가:

```python
revision = "xxxxxxxxxxxx"
down_revision = ("head1_rev", "head2_rev")

def upgrade(): pass
def downgrade(): pass
```

예방은 PR 머지 전 CI 에 `alembic heads` 한 줄 체크를 넣는 것. 우리도 이제 넣을 차례.

### 2) dev 와 prod 이미지 드리프트

dev compose 의 DB 이미지를 pgvector 내장본으로 바꾸는 커밋은 머지했지만 **prod compose 에는 반영이 빠졌다**. 그러다 pgvector 를 사용하는 마이그레이션이 prod 에 내려오면서 `CREATE EXTENSION vector` 가 터졌다.

```
extension "vector" is not available
```

교훈: dev/prod 분리하되 **"환경 공통 부분" 을 YAML anchor 또는 `docker-compose.override.yml` 패턴으로 묶어 놓으면** 이런 드리프트를 막을 수 있다. 지금 구조는 두 파일을 완전 독립으로 관리하고 있어 다음 리팩토링 타겟.

### 3) Runner 프로세스 env 오염

self-hosted runner 를 VSCode Remote 세션에서 수동 기동하면 세션 환경변수(`VSCODE_GIT_IPC_HANDLE`, `GIT_ASKPASS`) 가 프로세스에 박제돼서 세션 종료 후에도 `git fetch` 가 "죽은 소켓" 을 가리킨다. 이 얘기는 [별도 TIL](./2026-04-24-gitea-runner-vscode-env-til.md) 로 따로 정리했다.

셋 다 공통점은 **"로컬에서는 잘 되는데" 현상의 본질**. 운영 환경의 드리프트·프로세스 상태·동시성이 로컬과 달라서 생긴다.

## 지금 생각하는 개선 방향

- **CI 에 `alembic heads` 체크 추가** — 머지 전 멀티헤드 조기 감지
- **dev/prod compose 의 공통 베이스 추출** — 이미지/헬스체크 드리프트 방지
- **Runner 를 systemd user service 로 전환** — env 오염 재발 방지
- **Monitoring 스택 (Grafana + Loki)** — 현재는 `docker logs` 로 수동 추적 중

## 정리

자체 개발의 가장 큰 비용은 **운영**이다. 기능 개발보다 "내가 쓰는 추상화가 어디서 새는지" 를 이해하는 데 더 많은 시간이 간다. 대신 운영을 이해한 만큼 시스템에 대한 통제감이 생기고, SaaS 에서는 결코 안 해 줄 맞춤 기능을 한두 시간 만에 붙일 수 있다.

완벽하지 않지만 돌아가고, 돌아가면서 배우는 중이다.
