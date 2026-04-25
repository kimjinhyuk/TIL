# #08 — 현장 서버 pull-model 모니터링 + heartbeat 버퍼링

> **DRP Engineering Notes · Episode 08** &middot; 현장 서버는 방화벽 뒤에 있습니다. 본사에서 직접 들어갈 수 없고, 현장 인터넷도 균일하지 않습니다. 그런데도 운영자는 "지금 5번 현장 어디까지 그리고 있나, 펜 캘리브레이션은 됐나, 디스크 남았나" 를 알아야 합니다. 이 글은 DRP 가 **양방향 인지 (중앙↔현장)** 와 **버퍼링** 으로 이 문제를 해결한 방식을 정리합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 14px 20px;">
    <span style="color: #d2a8ff; font-weight: 700; font-size: 15px;">DRP 모니터링 요약</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">양방향</span> &nbsp;<strong>중앙 → 현장</strong> on-demand check + <strong>현장 → 중앙</strong> heartbeat push, 둘 다 운영</div>
    <div><span style="color:#f0883e; font-weight: 700;">네트워크</span> &nbsp;<strong>Tailscale</strong> 메시 VPN 으로 현장 서버를 본사 서버에 가상 노출 (외부 인터넷에는 닫힘)</div>
    <div><span style="color:#3fb950; font-weight: 700;">버퍼링</span> &nbsp;heartbeat 실패 시 <code>deque(maxlen=1000)</code> 에 쌓고, 다음 회차에 <strong>먼저 flush</strong></div>
    <div><span style="color:#f778ba; font-weight: 700;">알림</span> &nbsp;상태 전이 발생 시 <strong>Slack + Notion</strong> 병렬 발송, 정상 회복하면 알림 해소</div>
  </div>
</div></div>

---

## 토폴로지 — 누가 누구에게 무엇을 묻는가

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">

  <div style="border: 2px solid #58a6ff; border-radius: 10px; padding: 14px 32px; background: linear-gradient(135deg, #1f3a5f, #1a2744); text-align: center;">
    <span style="color: #58a6ff; font-weight: 700;">&#127970; 본사 — Monitoring Service (FastAPI + SQLite)</span>
    <div style="color: #8b949e; font-size: 12px; margin-top: 2px;">사이트 등록 / 상태 수집 / 알림 발송</div>
  </div>

  <div style="display: flex; gap: 80px; align-items: center;">
    <div style="color: #f0883e; font-size: 13px;">&#x21D5; on-demand check<br/><span style="color:#8b949e;">중앙 → 현장</span></div>
    <div style="color: #3fb950; font-size: 13px;">&#x21D5; heartbeat push<br/><span style="color:#8b949e;">현장 → 중앙</span></div>
  </div>

  <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
    <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden; min-width: 140px;">
      <div style="background: #04260f; padding: 8px 14px; text-align: center;">
        <span style="color: #3fb950; font-weight: 700; font-size: 13px;">현장 A</span>
      </div>
      <div style="background: #0d1117; padding: 8px 14px; color: #8b949e; font-size: 11.5px; line-height: 1.6;">
        Drawing API<br/>+ heartbeat<br/>+ JAKA 로봇
      </div>
    </div>
    <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden; min-width: 140px;">
      <div style="background: #04260f; padding: 8px 14px; text-align: center;">
        <span style="color: #3fb950; font-weight: 700; font-size: 13px;">현장 B</span>
      </div>
      <div style="background: #0d1117; padding: 8px 14px; color: #8b949e; font-size: 11.5px; line-height: 1.6;">
        Drawing API<br/>+ heartbeat<br/>+ JAKA 로봇
      </div>
    </div>
    <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden; min-width: 140px;">
      <div style="background: #04260f; padding: 8px 14px; text-align: center;">
        <span style="color: #3fb950; font-weight: 700; font-size: 13px;">현장 C</span>
      </div>
      <div style="background: #0d1117; padding: 8px 14px; color: #8b949e; font-size: 11.5px; line-height: 1.6;">
        Drawing API<br/>+ heartbeat<br/>+ JAKA 로봇
      </div>
    </div>
  </div>

  <div style="border: 1px dashed #d2a8ff; border-radius: 10px; padding: 8px 18px; background: #1a0e30; text-align: center;">
    <span style="color: #d2a8ff; font-weight: 600; font-size: 12px;">Tailscale 메시 VPN — 모든 노드가 가상 IP 로 직접 통신, 외부 인터넷엔 비공개</span>
  </div>

  <div style="display: flex; gap: 12px; align-items: center;">
    <div style="border: 1px solid #f778ba; border-radius: 8px; padding: 8px 14px; background: #2a0f1f; color: #f778ba; font-weight: 600; font-size: 12.5px;">&#128172; Slack</div>
    <div style="border: 1px solid #f0883e; border-radius: 8px; padding: 8px 14px; background: #1c1206; color: #f0883e; font-weight: 600; font-size: 12.5px;">&#128221; Notion</div>
  </div>

</div></div>

---

## 방향 1 — 중앙 → 현장 (on-demand check)

운영자가 대시보드에서 "지금 상태 보여줘" 누르면 즉시 현장 health 를 가져옵니다.

```python
# monitoring/api/check.py — 한 사이트 즉석 점검
@router.post("/sites/{site_id}/check")
async def check_site(site_id: str) -> dict:
    site = get_site_by_id(site_id)
    if not site:
        raise HTTPException(404, f"Site '{site_id}' not found")

    endpoint_url = site["endpoint_url"]   # 예: http://site-a-drp:8000
    site_name = site.get("site_name", "")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{endpoint_url}/api/v1/system/health-detail",
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        save_check_result(site_id, {"status": "offline", ...})
        await _handle_alerts(site_id, site_name, "offline", {})
        return {"status": "offline", ...}
    except httpx.TimeoutException:
        save_check_result(site_id, {"status": "timeout", ...})
        await _handle_alerts(site_id, site_name, "timeout", {})
        return {"status": "timeout", ...}

    save_check_result(site_id, data)
    site_status = data.get("status", "unknown")
    await _handle_alerts(site_id, site_name, site_status, data.get("checks", {}))

    return {
        "status": "ok",
        "site_id": site_id,
        "site_status": site_status,
        "checks": data.get("checks", {}),
        "uptime_seconds": data.get("uptime_seconds"),
        ...
    }
```

세 가지 결과가 모두 **저장 + 알림 처리**로 균일하게 흐른다는 게 포인트:

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; padding: 12px; background: #0d1117;">
    <div style="color: #3fb950; font-weight: 700; font-size: 13px;">healthy</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">기존 알림 자동 해결</div>
  </div>
  <div style="border: 1px solid #5a3600; border-radius: 10px; padding: 12px; background: #0d1117;">
    <div style="color: #f0883e; font-weight: 700; font-size: 13px;">degraded / unhealthy</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">알림 생성 + 어떤 체크가 문제인지 메시지에 포함</div>
  </div>
  <div style="border: 1px solid #5a1c1c; border-radius: 10px; padding: 12px; background: #0d1117;">
    <div style="color: #f85149; font-weight: 700; font-size: 13px;">offline</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">ConnectError → 사이트 응답 없음</div>
  </div>
  <div style="border: 1px solid #5a1c1c; border-radius: 10px; padding: 12px; background: #0d1117;">
    <div style="color: #f85149; font-weight: 700; font-size: 13px;">timeout</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">15초 안 응답 — 서버 과부하/네트워크 지연</div>
  </div>

</div></div>

---

## 방향 2 — 현장 → 중앙 (heartbeat push + 버퍼링)

각 현장 서버는 백그라운드 코루틴으로 **주기적 heartbeat** 를 보냅니다. 인터넷이 잠시 끊겨도 손실되지 않도록 **재전송 큐** 가 핵심.

```python
# backend/services/heartbeat/reporter.py
class HeartbeatReporter:
    def __init__(self):
        self._buffer: deque = deque(maxlen=1000)
        self._running = False

    async def collect_health_detail(self) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"http://localhost:{settings.api_port}/api/v1/system/health-detail",
                timeout=10,
            )
            return resp.json()

    async def send_heartbeat(self, data: dict):
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.central_api_url}/api/heartbeat",
                json=data,
                headers={"X-API-Key": settings.central_api_key},
                timeout=10,
            )

    async def flush_buffer(self):
        """이전 회차에 못 보낸 것부터 비운다."""
        while self._buffer:
            data = self._buffer[0]
            try:
                await self.send_heartbeat(data)
                self._buffer.popleft()
            except Exception:
                break  # 여전히 실패 → 멈추고 다음 회차 대기

    async def run(self):
        if not settings.central_api_url:
            logger.info("Heartbeat disabled (CENTRAL_API_URL not set)")
            return
        self._running = True
        while self._running:
            try:
                data = await self.collect_health_detail()
                await self.flush_buffer()
                await self.send_heartbeat(data)
            except Exception as e:
                logger.warning(f"Heartbeat failed, buffering: {e}")
                try:
                    self._buffer.append(await self.collect_health_detail())
                except Exception:
                    pass
            await asyncio.sleep(settings.heartbeat_interval_seconds)
```

### 버퍼링이 만드는 보장

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">

  <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
    <div style="border: 1px solid #3fb950; border-radius: 6px; padding: 6px 12px; background: #04260f; color: #3fb950; font-size: 12px; font-family: monospace;">T0 ✓</div>
    <div style="border: 1px solid #3fb950; border-radius: 6px; padding: 6px 12px; background: #04260f; color: #3fb950; font-size: 12px; font-family: monospace;">T1 ✓</div>
    <div style="border: 1px solid #f85149; border-radius: 6px; padding: 6px 12px; background: #2a0f0f; color: #f85149; font-size: 12px; font-family: monospace;">T2 ✗ buf</div>
    <div style="border: 1px solid #f85149; border-radius: 6px; padding: 6px 12px; background: #2a0f0f; color: #f85149; font-size: 12px; font-family: monospace;">T3 ✗ buf</div>
    <div style="border: 1px solid #f85149; border-radius: 6px; padding: 6px 12px; background: #2a0f0f; color: #f85149; font-size: 12px; font-family: monospace;">T4 ✗ buf</div>
    <div style="border: 1px solid #f0883e; border-radius: 6px; padding: 6px 12px; background: #1c1206; color: #f0883e; font-size: 12px; font-family: monospace;">T5 flush+send</div>
    <div style="border: 1px solid #3fb950; border-radius: 6px; padding: 6px 12px; background: #04260f; color: #3fb950; font-size: 12px; font-family: monospace;">T6 ✓</div>
  </div>
  <div style="color: #8b949e; font-size: 12px; margin-top: 8px;">T2~T4 동안 버퍼링된 3개가 T5 회복 시점에 모두 전송됨</div>

</div></div>

`maxlen=1000` 이라 너무 길게 끊겨 있으면 옛 데이터부터 자동 폐기 — **메모리 무한 증가 방지**. 1000 회차는 우리 주기에서 약 8~16시간 분.

---

## 알림 — Slack + Notion 병렬

상태가 *bad → good* 또는 *good → bad* 로 바뀔 때 알림이 발사됩니다.

```python
# monitoring/api/check.py — 알림 처리
async def _handle_alerts(site_id: str, site_name: str, status: str, checks: dict):
    if status in ("degraded", "unhealthy", "offline", "timeout"):
        unhealthy = [k for k, v in checks.items()
                     if isinstance(v, dict) and v.get("status") == "unhealthy"]
        message = (
            f"Site {site_id} ({site_name}) status: {status}. "
            f"Issues: {', '.join(unhealthy) or 'unknown'}"
        )
        alert = create_alert(site_id, status, message)
        await _notifier.send_alert(alert)

    if status == "healthy":
        # 자동 회복 처리 — 기존 미해결 알림 정리
        for at in ("degraded", "unhealthy", "offline", "timeout"):
            resolve_alerts(site_id, at)
```

`NotifierManager` 는 등록된 모든 채널을 **병렬로** 호출:

```python
# monitoring/services/notifier/__init__.py
class NotifierManager:
    def __init__(self):
        self._notifiers: List[BaseNotifier] = []
        if settings.slack_webhook_url:
            self._notifiers.append(SlackNotifier())
        if settings.notion_api_token and settings.notion_alerts_db_id:
            self._notifiers.append(NotionNotifier())

    async def send_alert(self, alert: dict) -> None:
        results = await asyncio.gather(
            *(n.send_alert(alert) for n in self._notifiers),
            return_exceptions=True,
        )
        for notifier, result in zip(self._notifiers, results):
            if isinstance(result, Exception):
                logger.error(f"{notifier.__class__.__name__} alert failed: {result}")
```

### Slack 메시지 — Block Kit

```python
blocks = [
    {"type": "header", "text": {"type": "plain_text",
        "text": f":rotating_light: Alert: {alert['alert_type']}"}},
    {"type": "section", "fields": [
        {"type": "mrkdwn", "text": f"*Site:*\n{alert['site_id']}"},
        {"type": "mrkdwn", "text": f"*Time:*\n{alert['created_at']}"},
    ]},
    {"type": "section", "text": {"type": "mrkdwn",
        "text": f"*Message:*\n{alert['message']}"}},
]
```

### Notion — 데이터베이스 row 생성

알림 한 건이 Notion DB 의 한 페이지가 됩니다. 추후 검색·필터·라벨링이 가능 → **알림이 단순 푸시가 아닌 "문서화된 사건"** 이 됨.

```python
payload = {
    "parent": {"database_id": settings.notion_alerts_db_id},
    "properties": {
        "현장": {"title": [{"text": {"content": alert["site_id"]}}]},
        "상태": {"select": {"name": alert["alert_type"]}},
        "Site ID": {"rich_text": [{"text": {"content": alert["site_id"]}}]},
        # ... 시간, 메시지 등
    },
}
```

Slack 은 즉시성, Notion 은 영속성 — 둘이 보완.

---

## 데이터 모델 — 관찰의 단위

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1fr 2.4fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">모델</div>
    <div style="padding: 10px 14px;">필드 / 의미</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2.4fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #58a6ff; font-family: monospace; font-size: 13px;">SiteRegisterRequest</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">site_id · site_name · endpoint_url</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2.4fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e; font-family: monospace; font-size: 13px;">SiteStatus</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">+ status · last_checked · version · config_hash · uptime_seconds</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2.4fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace; font-size: 13px;">HeartbeatRecord</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">id · site_id · checked_at · status · uptime · checks (dict) · config_hash</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2.4fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #d2a8ff; font-family: monospace; font-size: 13px;">SiteDetail</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">SiteStatus + recent_heartbeats[]</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2.4fr;">
    <div style="padding: 10px 14px; color: #f85149; font-family: monospace; font-size: 13px;">AlertItem</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">id · site_id · alert_type · message · created_at · resolved_at · resolved</div>
  </div>
</div></div>

`checks` 가 dict 라는 점 — 각 서브시스템(roboto, storage, gemini, db, calibration ...) 의 상태를 자유 키로 저장. **확장이 자유롭지만 분석은 약함**.

---

## 한계 — 지금 모니터링의 약점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; JSON blob 시계열 분석 약함</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      checks 가 자유 dict. "이번 주 평균 disk_free 추세" 같은 분석을 SQL 한 줄로 못 함.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 알림 임계가 코드</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "어떤 상태일 때 alert" 가 Python 코드에 박혀 있음. 임계 변경 = 배포.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 대시보드 미흡</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      현재 사이트 목록/상태만 노출. 시계열 그래프, 비교 차트, 이벤트 타임라인 부재.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 알림 노이즈</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      잠깐 끊겼다 회복하는 케이스에서도 alert 발사. 디바운스/그룹화 부재.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">&#9888; heartbeat 인터벌이 정적</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      모든 현장이 같은 주기. 큰 이벤트 동안엔 더 자주, 야간엔 드물게 보내고 싶지만 미지원.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 14px;">&#9888; 자동 복구 부재</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      현장이 unhealthy 가 되어도 모니터링은 알림만 보냄. <strong>재시작 / 재캘리브레이션 / 경량 리셋</strong> 같은 자동 액션 없음.
    </div>
  </div>

</div></div>

---

## 개선 방향

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; Prometheus exporter + Grafana</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      현장 서버에 <code>/metrics</code> 노출, 중앙은 Prometheus 가 scrape. SiteStatus / 로봇 상태 / 드로잉 처리량 / Gemini 응답시간을 시계열로 본다. Grafana 로 추세/임계 알림. JSON blob 모니터링과 병행 운영.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; OpenTelemetry trace + Sentry</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      AI 라인 드로잉 → 벡터화 → 좌표 변환 → 로봇 송신을 <strong>한 trace 로 묶어 본다</strong>. 어디서 느려졌는지/실패했는지 시각화. 에러는 Sentry 로 자동 집계.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; 알림 디바운스/그룹화</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "30초 내 동일 site_id+alert_type 은 하나로 합친다" 룰 추가. 잠깐 끊긴 후 회복 시엔 알림 자체를 보내지 않는 옵션도. Slack/Notion 노이즈 감소.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 자동 복구 액션</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      특정 unhealthy 패턴(예: 로봇 미연결 5분 지속) 에서 <strong>중앙이 현장에 재기동/재캘리브레이션 명령</strong>을 push. 사람이 도착하기 전에 1차 자가 복구.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; 적응형 heartbeat 인터벌</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      이벤트 진행 중엔 <strong>10초 주기</strong>, 휴면 시간엔 <strong>5분 주기</strong>. 중앙이 현장에 인터벌을 push 로 조정.
    </div>
  </div>

  <div style="border: 1px solid #f85149; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700;">6 &middot; 알림 임계 외부화 (YAML/UI)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      알림 룰을 코드에서 분리해 YAML/DB로. 사이트별/상태별 다른 임계, on-call 매핑까지 외부화. 배포 없이 임계 조정.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">7 &middot; 시계열 대시보드 페이지</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      외부 Grafana 도입 전이라도 모니터링 서비스 자체에 <strong>recharts 기반 추세 페이지</strong>. 사이트별 uptime/응답시간 24h, 7d 차트.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    DRP 의 모니터링 디자인은 단순한 두 가지를 잘 묶었다 &mdash; <strong>"중앙도 물어볼 수 있고, 현장도 말해줄 수 있다"</strong> 는 양방향, 그리고 <strong>"끊긴 동안 잃지 않는다"</strong> 는 버퍼링. 이 둘이 있어 운영자는 노트북 하나로 5 개 현장을 본다. 다음 단계는 <em>"본다 → 분석한다"</em>로의 진화 &mdash; Prometheus 시계열, OpenTelemetry trace, 자동 복구 액션. 모니터링이 사람을 부르는 시스템에서 <strong>스스로 고치는 시스템</strong>으로.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#07 — 백그라운드 세션 관리 + Gentle Stop](./2026-04-25-07-background-session-gentle-stop.md)
- 다음: [#09 — Flutter 앱 아키텍처 + 모노레포 운영 + 회고와 다음 단계](./2026-04-25-09-flutter-monorepo-retrospective.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
