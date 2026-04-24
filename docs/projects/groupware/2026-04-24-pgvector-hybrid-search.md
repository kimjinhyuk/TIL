# PostgreSQL 하나로 해낸 하이브리드 검색 — pgvector + trigram + RRF

> 본 글은 팀에서 함께 진행한 사내 그룹웨어/ERP 프로젝트의 일부를 일반화해 정리한 것입니다. 구체적 수치·이름·경로는 공개 가능한 수준으로 치환했습니다.

## 풀려던 문제

내부 업무 시스템의 게시판에서 "작년 연말정산 안내 어디 있지?" 같은 자연어 질의에 대응하지 못하는 게 반복적으로 올라왔다. 기존 검색은 `title ILIKE '%연말정산%'` 수준이라 제목에 그 키워드가 들어간 글만 찾고, 본문에만 있거나 말을 살짝 바꾼 질문에는 손을 놓았다.

Elasticsearch 를 따로 띄울 수도 있었지만 몇 가지가 걸렸다.

- 이미 PostgreSQL 이 운영 중이라 컴포넌트 하나 늘리는 게 부담
- 검색 대상 규모가 수십만 건 수준이라 전문 검색 엔진까지 필요한가 싶음
- 권한 체계(테넌트/부서/비밀글)가 복잡해서 **권한 필터를 DB 쿼리에 묶어 두는 게 안전함** — 별도 엔진에 권한 상태를 동기화하는 비용이 크다

그래서 "**PostgreSQL 안에서 해결한다**" 는 제약을 먼저 걸었다.

## 왜 하이브리드?

임베딩 벡터 검색만 쓰면 의미는 잘 잡지만, 사람 이름·제품 코드 같은 고유명사 키워드에서 약하다. 반대로 trigram 키워드만 쓰면 동의어/의역에 취약하다. 사내 검색에는 두 유형의 질의가 모두 들어온다.

> "외근 교통비 어떻게 처리?" → 의미 기반 검색 유리
>
> "HX-2410 발주 내역" → 키워드 정확 매칭 유리

두 개를 합치되, 단순 점수 가중합으로 합치면 각 랭킹의 점수 스케일이 달라 튜닝이 괴롭다. **Reciprocal Rank Fusion (RRF)** 을 쓰면 순위만 사용해서 스케일 차이를 잘 흡수한다.

```python
def reciprocal_rank_fusion(*rankings, k=60):
    scores = {}
    for ranking in rankings:
        for key, rank in ranking:  # rank 는 0, 1, 2, ...
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
```

상수 `k=60` 은 RRF 원논문 기본값. 상위권(1~5등) 사이 격차를 완만하게 만들어 랭킹 안정성을 높여 준다.

## 스키마 설계 — 청크 단위 row

핵심은 **청크 단위** 임베딩 테이블. 긴 게시글을 하나의 벡터로 요약하면 정보 손실이 크니 500 토큰 슬라이딩 윈도우(overlap 50) 로 잘라 각 청크를 별개 row 로 저장한다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE post_embeddings (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     UUID NOT NULL,
    post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    source_type   VARCHAR(20) NOT NULL,   -- 'title' | 'body' | 'comment'
    source_id     UUID NOT NULL,
    chunk_index   INTEGER NOT NULL,
    chunk_text    TEXT NOT NULL,
    embedding     vector(1024) NOT NULL,
    content_hash  VARCHAR(64) NOT NULL,   -- 재인덱싱 skip 용
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_type, source_id, chunk_index)
);
```

설계 포인트:

- `vector(1024)` — 사용할 임베딩 모델(bge-m3) 차원과 일치
- `content_hash` — 게시글 수정 시 텍스트가 실제로 바뀌었는지 해시로 확인해서 **같은 내용이면 임베딩 재계산을 건너뜀**
- `source_type` — 제목/본문/댓글을 같은 테이블에 저장해 하나의 인덱스로 검색

## 인덱스는 CONCURRENTLY 로

HNSW 인덱스를 일반 `CREATE INDEX` 로 만들면 그 테이블에 긴 락을 잡아서 서비스 중단이 난다. `CONCURRENTLY` 로 백그라운드 생성해야 한다. 문제는 Alembic 이 모든 DDL 을 트랜잭션 안에서 돌리는데 **`CREATE INDEX CONCURRENTLY` 는 트랜잭션 밖에서만 된다**. 우회 패턴:

```python
def _run(stmts: list[str]) -> None:
    """Alembic 트랜잭션을 잠시 빠져나와 CONCURRENTLY 실행."""
    conn = op.get_bind()
    conn.execute(text("COMMIT"))      # Alembic 의 txn 종료
    for sql in stmts:
        conn.execute(text(sql))        # 각 문은 자동커밋으로 실행
    conn.execute(text("BEGIN"))       # version 기록용 txn 재개


def upgrade() -> None:
    _run([
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emb_vec "
        "ON post_embeddings USING hnsw (embedding vector_cosine_ops)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_title_trgm "
        "ON posts USING gin (title gin_trgm_ops)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_body_trgm "
        "ON posts USING gin (body gin_trgm_ops)",
    ])
```

커밋 앞뒤로 txn 을 여닫아 Alembic 의 `alembic_version` 테이블 기록까지 안전하게 돌린다.

## 임베딩 — bge-m3, 로컬 CPU

모델 선택 기준:

- 한국어/영어 멀티링궐 성능
- MTEB 한국어 벤치에서 상위권
- 라이선스 (MIT)

**bge-m3** 가 맞아떨어졌다. `sentence-transformers` 로 로컬 CPU 인퍼런스. 쿼리 한 건 인코딩에 CPU 200~800ms 수준.

```python
class BgeM3Provider:
    _lock = threading.Lock()

    def __init__(self, model_name="BAAI/bge-m3", device="cpu"):
        self._model_name = model_name
        self._device = device
        self._model: SentenceTransformer | None = None

    def _ensure_loaded(self) -> SentenceTransformer:
        if self._model is None:
            with self._lock:
                if self._model is None:
                    self._model = SentenceTransformer(
                        self._model_name, device=self._device
                    )
        return self._model

    def encode_query(self, text: str) -> list[float]:
        model = self._ensure_loaded()
        vec = model.encode(
            [text],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )[0]
        return vec.tolist()
```

`normalize_embeddings=True` 를 꼭 줘야 pgvector 의 `vector_cosine_ops` 와 수학적으로 정합한다 (정규화 후엔 코사인 거리가 L2 거리 / 2 로 단순화되어 HNSW 가 예상대로 동작).

### 함정: async 이벤트 루프 블로킹

`encode_query` 는 동기 호출이다. FastAPI async 핸들러 안에서 그냥 불러버리면 **uvicorn 이벤트 루프 전체를 수백 ms 씩 블로킹**한다. 한 사용자의 검색이 다른 요청들을 다 멈추게 한다. 해법은 단순.

```python
qvec = await asyncio.to_thread(self._embedding.encode_query, query)
```

스레드풀로 옮겨주면 이벤트 루프는 자유로워진다. 부팅 시 한 번 warm-up 호출을 넣어 첫 요청 지연(콜드 스타트) 도 제거했다.

## 검색 쿼리 두 갈래

**1) 벡터 검색** — HNSW 인덱스 + 코사인 거리

```python
qvec = await asyncio.to_thread(embedding.encode_query, query)
vec_rows = (await db.execute(
    select(
        PostEmbedding.post_id,
        PostEmbedding.source_type,
        PostEmbedding.chunk_text,
        (1 - PostEmbedding.embedding.cosine_distance(qvec)).label("sim"),
    )
    .join(Post, PostEmbedding.post_id == Post.id)
    .where(access_filter)
    .order_by(PostEmbedding.embedding.cosine_distance(qvec))
    .limit(CANDIDATE_POOL)  # 예: 50
)).all()
```

**2) trigram 키워드 검색** — gin 인덱스 + 유사도

```python
kw_sim = func.greatest(
    func.similarity(Post.title, query),
    func.similarity(Post.body, query),
)
kw_rows = (await db.execute(
    select(Post.id.label("post_id"), kw_sim.label("sim"))
    .where(
        and_(
            access_filter,
            kw_sim > KW_MIN_SIM,   # 노이즈 컷, 예: 0.1
        )
    )
    .order_by(kw_sim.desc())
    .limit(CANDIDATE_POOL)
)).all()
```

각각 상위 N 개 후보를 뽑은 뒤 RRF 로 병합.

```python
vec_ranking = [(row.post_id, rank) for rank, row in enumerate(vec_rows)]
kw_ranking  = [(row.post_id, rank) for rank, row in enumerate(kw_rows)]
fused = reciprocal_rank_fusion(vec_ranking, kw_ranking, k=60)
top_post_ids = [pid for pid, _ in fused[:limit]]
```

`access_filter` 를 **두 쿼리에 똑같이** 걸어서 권한을 DB 레벨에서 일관되게 보장한다. 검색 엔진을 DB 밖으로 빼지 않은 가장 큰 이유이기도 하다.

## 성능 관찰

- 수만 개 청크 row 기준, HNSW 벡터 검색 10ms 안쪽
- trigram 검색은 문서 수·본문 길이에 비례, 수만~수십만 row 에서 수십 ms
- **쿼리 임베딩 200~800ms 가 전체 레이턴시의 지배 요소** → 모델 warm-up 필수
- CONCURRENTLY 로 인덱스 생성해 두면 운영 중 재빌드도 안전

## 안 쓴 것들 / 왜

- **Elasticsearch/OpenSearch** — 운영 컴포넌트 증가, 권한 동기화 비용
- **외부 임베딩 API** — 내부 본문이 외부로 나가는 게 정책상 불가
- **dot product vs cosine** — `normalize_embeddings=True` 로 정규화한 뒤라 결과는 사실상 동일. `vector_cosine_ops` 인덱스에 맞추려고 코사인으로 통일

## 정리

PostgreSQL 하나로도 현실적인 하이브리드 검색이 된다. 핵심은:

1. **청크 단위 벡터 row** — 긴 문서 정보 손실 방지 + content_hash 로 재인덱싱 비용 절약
2. **HNSW 는 CONCURRENTLY** — Alembic 트랜잭션 우회 패턴 숙지
3. **RRF 로 두 랭킹 병합** — 점수 스케일 걱정 없음
4. **동기 임베딩 호출은 `asyncio.to_thread`** — 이벤트 루프 지키기
5. **권한 필터를 두 쿼리에 동일 적용** — 검색 엔진을 DB 밖으로 빼지 않는 가장 큰 이유

다음 단계는 첨부파일 본문 추출(PDF/DOCX) 과 타 모듈로의 확장. 그 얘기는 또 다음에.
