# #07 — 백그라운드 세션 관리 + Gentle Stop

> **DRP Engineering Notes · Episode 07** &middot; 한 번의 드로잉은 1~5분이 걸립니다. 그 사이 운영자는 다른 일을 해야 하고, 사용자는 진행률을 보고 싶고, 가끔은 **즉시 중단**도 필요합니다. 그것도 — 로봇 전원을 끊지 않고. 이 글은 DRP 의 `DrawingSession` 이 어떻게 라이프사이클을 관리하고, "Gentle Stop" 이 정확히 무엇이며, 왜 이 구조가 지금은 충분하지만 다음 단계에서는 부족한지 정리합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #58a6ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1f3a5f, #1a2744); padding: 14px 20px;">
    <span style="color: #58a6ff; font-weight: 700; font-size: 15px;">DrawingSession 운영 요약</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#f0883e; font-weight: 700;">스레드 격리</span> &nbsp;세션 1개 = daemon thread 1개. <code>asyncio.to_thread</code> 가 아닌 <strong>독립 스레드</strong>로 띄움 — 동기 socket + sleep 구조 호환</div>
    <div><span style="color:#3fb950; font-weight: 700;">생애</span> &nbsp;<code>pending → running → stopping → stopped/failed/completed</code> 6 상태 머신, 모든 전이는 <code>threading.Lock</code> 보호</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">Gentle Stop</span> &nbsp;전원/서보 유지하되 <strong>현재 동작만</strong> 정지 — <code>stop_program</code> + <code>pause_program</code> 둘 다 시도</div>
    <div><span style="color:#f778ba; font-weight: 700;">진행률</span> &nbsp;polling 으로 <code>{progress_sent, progress_total, status}</code> 조회. 현재 SSE 없음 (개선 항목)</div>
  </div>
</div></div>

---

## 왜 백그라운드 세션이 필요한가

```text
요청 1개 = 길고, 취소 가능하고, 외부 관찰자가 있어야 한다
```

세 가지 요구가 동시에 걸리는 워크로드:

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">길다 (1~5 분)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      HTTP 요청 한 개로 동기 처리할 수 없음. 응답을 기다리며 다른 호출이 막히면 안 됨.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">취소 가능해야</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      "사용자가 자세 바꿈" / "잘못된 사진" 등으로 즉시 멈춰야 할 때가 있음. 안전 정지 필수.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">관찰 가능해야</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      태블릿 UI 가 진행률 표시. 운영자 대시보드도 현재 세션의 상태/에러 알아야.
    </div>
  </div>

</div></div>

`session_manager` 가 이 셋을 책임집니다.

---

## 라이프사이클 6 상태

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">

  <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
    <div style="border: 1px solid #58a6ff; border-radius: 10px; padding: 10px 18px; background: #0c2d6b;">
      <span style="color: #58a6ff; font-weight: 700;">pending</span>
      <div style="color: #8b949e; font-size: 11px; margin-top: 2px;">생성 직후</div>
    </div>
    <div style="color: #484f58; align-self: center;">&rarr;</div>
    <div style="border: 1px solid #3fb950; border-radius: 10px; padding: 10px 18px; background: #04260f;">
      <span style="color: #3fb950; font-weight: 700;">running</span>
      <div style="color: #8b949e; font-size: 11px; margin-top: 2px;">스레드 시작 + init 시퀀스</div>
    </div>
  </div>

  <div style="color: #484f58; font-size: 18px;">&#x2199; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#x2198;</div>

  <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
    <div style="border: 1px solid #d2a8ff; border-radius: 10px; padding: 10px 18px; background: #1a0e30;">
      <span style="color: #d2a8ff; font-weight: 700;">stopping</span>
      <div style="color: #8b949e; font-size: 11px; margin-top: 2px;">cancel 요청 받음</div>
    </div>
    <div style="border: 1px solid #f0883e; border-radius: 10px; padding: 10px 18px; background: #1c1206;">
      <span style="color: #f0883e; font-weight: 700;">completed</span>
      <div style="color: #8b949e; font-size: 11px; margin-top: 2px;">정상 종료 + 홈 복귀</div>
    </div>
  </div>

  <div style="color: #484f58; font-size: 18px;">&#x2199; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &#x2198;</div>

  <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
    <div style="border: 1px solid #f85149; border-radius: 10px; padding: 10px 18px; background: #2a0f0f;">
      <span style="color: #f85149; font-weight: 700;">stopped</span>
      <div style="color: #8b949e; font-size: 11px; margin-top: 2px;">사용자 취소로 종료</div>
    </div>
    <div style="border: 1px solid #f85149; border-radius: 10px; padding: 10px 18px; background: #2a0f0f;">
      <span style="color: #f85149; font-weight: 700;">failed</span>
      <div style="color: #8b949e; font-size: 11px; margin-top: 2px;">예외/connection lost 등</div>
    </div>
  </div>

</div></div>

모든 상태 전이는 `self._lock` 안에서 일어납니다 — `progress_sent` 갱신, `_cancel_requested` 체크 등도 동일.

---

## 세션 시작 — 한 요청에 무슨 일이 일어나나

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="border: 2px solid #58a6ff; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #1f3a5f, #1a2744); text-align: center;">
    <span style="color: #58a6ff; font-weight: 700;">POST /api/v1/image/process-image &middot; auto_execute=true</span>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;"><span style="color: #f0883e; font-weight: 700;">&#9312; 이미지 → RobotCommand[N] 생성 (#03)</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px;">async pipeline 으로 다운로드 / 벡터화 / 좌표 변환. 결과 = 명령 리스트.</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;"><span style="color: #3fb950; font-weight: 700;">&#9313; DrawingSession 생성 + start()</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px;">UUID 발급, status=pending. <code>threading.Thread(daemon=True)</code> 로 _run 띄움.</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;"><span style="color: #d2a8ff; font-weight: 700;">&#9314; 즉시 응답 — { session_id, status: "running" }</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px;">HTTP 요청은 ~밀리초 단위로 끝. 클라이언트는 session_id 로 polling.</div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;"><span style="color: #f778ba; font-weight: 700;">&#9315; 백그라운드 스레드 — 실제 드로잉</span></div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px;">SyncRobotClient 연결 → init 시퀀스 → moveL × N → 홈 복귀 → execution_summary 저장.</div>
  </div>

</div></div>

### 백그라운드 루프 (`_run`) 핵심

```python
def _run(self) -> None:
    self.status = "running"
    self.started_at = time.time()
    client = SyncRobotClient(host=self.host, port=self.port)
    self._client = client
    try:
        if not client.connect():
            raise RuntimeError("Failed to connect to robot")

        # 초기화 시퀀스 (#01 의 동작 호환 보존)
        for cmd in [
            {"cmdName": "power_on"},
            {"cmdName": "enable_robot"},
            {"cmdName": "joint_move",
             "jointPosition": [0, -30, -125, 0, 65, 0],
             "speed": 500.0, "relFlag": 0},
        ]:
            with self._lock:
                if self._cancel_requested:
                    raise InterruptedError("Cancelled before drawing")
            client.send_command(json.dumps(cmd))
            time.sleep(0.05)

        # 드로잉 본체
        for i, cmd_obj in enumerate(self.commands):
            with self._lock:
                if self._cancel_requested:
                    raise InterruptedError("Cancelled during drawing")
            response = client.send_command(json.dumps(cmd_obj.to_wire()))
            with self._lock:
                self.progress_sent += 1
                self.updated_at = time.time()
            time.sleep(0.05)

        # 정상 완료 → 홈 복귀
        if not self._cancel_requested:
            client.send_command(json.dumps(home_cmd))
            self.status = "completed"
            self.completed_at = time.time()
            self._update_history()

    except InterruptedError:
        self.status = "stopped"
        self._update_history()
    except Exception as exc:
        self.status = "failed"
        self.error = str(exc)
        self._update_history()
    finally:
        if client.is_connected:
            client.disconnect()
```

루프의 **모든 반복마다 `_cancel_requested` 를 lock 안에서 확인**하는 게 포인트. cancel 이 신호 던지면 루프가 다음 명령에서 빠져나옵니다.

---

## Gentle Stop — "전원 끊지 말고 동작만 멈춰라"

처음에는 <code>cancel = disconnect</code> 로 했습니다. 그런데 운영해 보니:

<div style="padding: 16px 0;"><div style="border-left: 3px solid #f85149; background: #2a0f0f; padding: 14px 18px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.8;">
  <strong style="color:#f85149;">문제 시나리오</strong> &mdash; 사용자가 "잠시" 멈추고 싶다고 cancel 을 눌렀는데, 백엔드가 disconnect 를 던지면 로봇이 <strong>전원 OFF + 서보 비활성</strong> 으로 떨어진다. 다시 그리려면 power_on / enable_robot 시퀀스부터. 현장 체감으로는 "방금 한 그림이 통째로 망가짐" 처럼 보임.
</div></div>

해법: **명령은 멈추되 로봇은 살아있게**. JAKA 의 두 명령을 함께 시도합니다 — 펌웨어 버전마다 어느 쪽이 정답인지 다르기 때문에.

```python
def _send_gentle_stop(self) -> None:
    """전원/서보 유지하고 현재 동작만 정지."""
    if self._client is None or not self._client.is_connected:
        return
    try:
        # 표준: stop_program (현재 프로그램 정지, 전원 유지)
        self._client.send_command('{"cmdName":"stop_program"}')
    except Exception:
        pass
    try:
        # 폴백: pause_program (일부 펌웨어가 stop 미지원)
        self._client.send_command('{"cmdName":"pause_program"}')
    except Exception:
        pass


def cancel(self) -> None:
    with self._lock:
        if self._cancel_requested:
            return
        self._cancel_requested = True
        self.status = "stopping"
        self.updated_at = time.time()
        if self._client is not None:
            self._client.request_cancel()
            try:
                self._send_gentle_stop()
            except Exception:
                pass
```

흐름:

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; padding: 10px 16px; background: #0c2d6b; color: #58a6ff; font-weight: 600; font-size: 13px;">
    DELETE /api/v1/robot/sessions/{id}
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; padding: 10px 16px; background: #1a0e30; color: #d2a8ff; font-weight: 600; font-size: 13px;">
    DrawingSession.cancel() — _cancel_requested = True + status = "stopping"
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; padding: 10px 16px; background: #1c1206; color: #f0883e; font-weight: 600; font-size: 13px;">
    _send_gentle_stop() — stop_program + pause_program (둘 다 시도)
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; padding: 10px 16px; background: #04260f; color: #3fb950; font-weight: 600; font-size: 13px;">
    백그라운드 루프 다음 반복에서 InterruptedError → status = "stopped"
  </div>
  <div style="color: #484f58;">&#x25BC;</div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; padding: 10px 16px; background: #2a0f1f; color: #f778ba; font-weight: 600; font-size: 13px;">
    로봇은 전원 ON / 서보 활성 / 마지막 자세 유지 — 즉시 재개 가능
  </div>

</div></div>

---

## 진행률 — 폴링으로 보는 살아있는 상태

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="background: #161b22; padding: 10px 14px; border-bottom: 1px solid #30363d;">
    <span style="color: #e6edf3; font-weight: 600; font-size: 13px;">GET /api/v1/robot/sessions/{id} → JSON</span>
  </div>
  <div style="padding: 14px;">

```json
{
  "id": "8f3c...",
  "status": "running",
  "progress_sent": 432,
  "progress_total": 1280,
  "started_at": 1714032000.123,
  "updated_at": 1714032120.456,
  "error": null
}
```

  </div>
</div></div>

태블릿 UI 는 이걸 1~2초 간격으로 polling 하며 진행률 바를 채웁니다. 단순하지만 신뢰할 수 있는 패턴 — 클라이언트가 살았다 죽었다 해도 동기화 문제 없음.

---

## 동시성 — 왜 한 세션만 허용되는가

`RobotSessionManager` 는 멀티 세션을 코드상 지원하지만, **현장 한 곳당 로봇 1 대** 가 강제이므로 동시 실행은 엄격히 1 개:

```python
# api/robot_session.py — 새 세션 시작 시 기존 세션 차단
existing = session_manager.get_active()
if existing and existing.status in {"pending", "running", "stopping"}:
    raise HTTPException(409, "Another drawing session is active")
```

언젠가 한 서버가 여러 로봇을 다루게 되면 이 자리가 **세션 큐 + 로봇별 락** 으로 진화해야 합니다.

---

## 한계 — 지금 세션 관리의 약점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 폴링 부하 + 지연</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      태블릿이 1~2초마다 세션 GET. 다수 화면이 같이 보면 N 배 부하. 진행률 갱신은 최대 polling 주기만큼 늦음.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 단일 세션 강제</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      한 서버에 로봇 2 대가 붙는 미래엔 코드 전반(세션 ID 관리, 락, 큐) 재설계 필요.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 재개(resume) 불가</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      cancel 후 "이어서 그리기" 가 없음. <code>progress_sent</code> 인덱스부터 다시 시작하는 로직 미구현.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 동기 socket + sleep</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      스레드가 socket recv 안에서 블로킹. cancel 신호가 송수신 사이에 있어야 즉시 반응. <strong>최대 50ms~수초 지연</strong>이 가능.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">&#9888; 진행률이 "명령 수" 기준</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      명령 1 개의 길이가 다 다른데 모두 같은 비중으로 누적. 표시되는 % 가 실제 시간과 안 맞음.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 14px;">&#9888; 좀비 세션 위험</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      서버 재기동 후 전 세션 상태가 메모리에서 날아감. 로봇은 마지막 자세에 머물러 있는데 백엔드는 모름.
    </div>
  </div>

</div></div>

---

## 개선 방향

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; SSE 진행률 스트림</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>GET /sessions/{id}/events</code> &mdash; 진행률/상태 변경을 push. 폴링 부하 사라지고, UI 가 즉시 반응. FastAPI <code>EventSourceResponse</code> 로 30 줄.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; 세션 상태 영속화</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      세션 상태/진행률을 SQLite 에 매 N 명령마다 기록. 서버 재기동 시 <em>"running 이었던 세션이 좀비"</em> 감지 → 강제 종료/회복 절차.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; resume(이어 그리기)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      stopped 세션의 <code>progress_sent</code> 부터 재시작. 로봇은 마지막 위치에 그대로 있으니 가능. 단 명령 인덱스와 펜 상태(up/down) 의 정합성 확인 필요.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 시간 기반 진행률</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      각 명령의 <strong>예상 소요 시간</strong> (path 길이 / 속도 + 펜 up/down 비용) 을 사전 추정. 진행률을 "총 예상 시간" 대비로 표시해 UX 개선.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; 멀티 세션 큐</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      한 서버에 로봇 2+ 대가 붙는 미래 대비. 세션 큐 + 로봇별 락 + 우선순위. 지금은 단일 세션이 강제라 불필요.
    </div>
  </div>

  <div style="border: 1px solid #f85149; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700;">6 &middot; 비상 정지 (E-stop) 모드</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      gentle stop 외에 <strong>전원 즉시 차단 + 서보 OFF</strong> 의 hard stop. 안전 사고 발생 시 사용. 별도 엔드포인트 + 물리 버튼과 연동 가능.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">7 &middot; asyncio 전환 (선택적)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      asyncio socket 으로 옮기면 cancel 반응이 즉시(socket select). 다만 #01 의 "동작 호환 우선" 원칙 + 멀티 로봇 도입 시점이 동시에 와야 정당화.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    세션 관리는 단순해 보이지만 <strong>"긴 작업 + 취소 + 관찰" 의 3중 요구가 동시에 걸리는 자리</strong>다. DRP 는 동기 스레드 + lock + cancel flag + gentle stop 으로 현재 운영을 견디고 있다. 다음 단계는 <em>SSE 로 폴링 부하를 빼고, 영속화로 좀비를 잡고, resume 으로 사용자 경험을 회복하는 것</em>. asyncio 전환은 멀티 로봇이 정말 필요해질 때 함께.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#06 — 펜 자동 캘리브레이션](./2026-04-25-06-pen-auto-calibration.md)
- 다음: [#08 — 현장 서버 pull-model 모니터링 + heartbeat 버퍼링](./2026-04-25-08-pull-model-monitoring.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
