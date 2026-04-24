# 사내 그룹웨어 / ERP

회사 내부에서 함께 운영 중인 그룹웨어·ERP 프로젝트를 만들면서 기록한 글들입니다. 구체적인 회사명, 모듈명, 운영 수치는 공개 가능한 수준으로 일반화했습니다.

## 스택 한눈에 보기

- **백엔드** — FastAPI · SQLModel · Alembic
- **프론트엔드** — Next.js 15 (App Router) · shadcn/ui · TanStack Query
- **DB / 검색** — PostgreSQL · pgvector · pg_trgm (RRF 하이브리드)
- **LLM** — llama.cpp · 온프레미스 GPU · 오픈웨이트 모델
- **인프라** — Docker Compose · Gitea Actions self-hosted runner · nginx

## 글 목록

### 아키텍처 / 의사결정

- [사내 ERP 를 FastAPI + Next.js + 온프레미스 LLM 으로 만들면서 — 스택 선택의 이유](./2026-04-24-onprem-erp-stack.md)

### 검색

- [PostgreSQL 하나로 해낸 하이브리드 검색 — pgvector + trigram + RRF](./2026-04-24-pgvector-hybrid-search.md)

### 운영 / 인프라 TIL

- [Self-hosted Gitea Runner 가 VSCode 환경변수를 물고 늘어지는 함정](./2026-04-24-gitea-runner-vscode-env-til.md)
