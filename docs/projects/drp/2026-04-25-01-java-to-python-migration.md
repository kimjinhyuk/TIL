# #01 — Android Java TcpClient → Python 마이그레이션: "동작 호환 우선" 전략

> **DRP Engineering Notes · Episode 01** &middot; DRP 의 시작은 Android Java 앱이었습니다. `TcpClient.java` 한 파일이 로봇 초기화 · 드로잉 실행 · 홈 복귀까지 전부 책임지고 있었고, 이걸 서버(Python/FastAPI)로 옮겨야 했습니다. 이 글은 그 과정에서 지킨 딱 하나의 원칙 — **"먼저 똑같이 돌게 한다. 개선은 그 다음이다"** — 에 대한 기록입니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 14px 20px;">
    <span style="color: #f0883e; font-weight: 700; font-size: 15px;">마이그레이션 규칙 — 동작 호환 우선</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">1.</span> <strong>명령 시퀀스 1:1 보존</strong> — Java 가 보내던 순서/개수/페이로드를 그대로</div>
    <div><span style="color:#f0883e; font-weight: 700;">2.</span> <strong>파라미터 수치 1:1 보존</strong> — speed / accel / tolerance / home 각도를 하드코드 대조</div>
    <div><span style="color:#3fb950; font-weight: 700;">3.</span> <strong>타이밍 1:1 보존</strong> — <code>Thread.sleep(50)</code> &rarr; <code>time.sleep(0.05)</code>, 홈 폴링 0.002도 · 10초 타임아웃까지</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">4.</span> <strong>비동기로 안 바꿈</strong> — 로봇 제어는 strict ordering. async 전환은 <em>검증 후</em> 단계 작업으로 분리</div>
  </div>
</div></div>

---

## 원본의 모습 — 단일 스레드 + 동기 소켓 + `Thread.sleep`

Android 앱의 `TcpClient.java` 는 한 스레드 안에서 초기화 → 수십~수백 개의 `moveL` → 홈 복귀를 **순서대로** 돌리는 단순 구조였습니다.

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">

  <div style="width: 100%; max-width: 640px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #2d1a04; padding: 10px 14px; text-align: center;">
      <span style="color: #f0883e; font-weight: 700;">&#9881; 초기화 3 단계</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      power_on &rarr; enable_robot &rarr; joint_move(home)<br/>
      <span style="color:#484f58;">각 명령 사이 Thread.sleep(50)</span>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; text-align: center;">
      <span style="color: #58a6ff; font-weight: 700;">&#9999; 드로잉 루프</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      for path in paths:<br/>
      &nbsp;&nbsp;penDown &rarr; moveL * N &rarr; penUp<br/>
      <span style="color:#484f58;">moveL 사이 Thread.sleep(50)</span>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; text-align: center;">
      <span style="color: #3fb950; font-weight: 700;">&#8984; 홈 복귀 + 도달 확인</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      joint_move(home) &rarr; while: get_joint_pos &rarr; abs(diff) &lt;= 0.002?<br/>
      <span style="color:#484f58;">최대 200회 * Thread.sleep(50) = 10초</span>
    </div>
  </div>

</div></div>

이 구조가 현장에서 **잘 돌고 있었고**, 고객사 검수/안전성 승인이 이 구조 위에서 이뤄졌다는 점이 중요합니다. 즉 "이미 옳다고 증명된 시퀀스" 였습니다.

---

## 원칙 1 — 명령 시퀀스 1:1

원본 Java 의 초기화 코드와, Python 으로 옮긴 코드를 나란히 둡니다.

### Java (원본)

```java
// TcpClient.java — 초기화 시퀀스
String[] initialCommands = {
    "{\"cmdName\":\"power_on\"}",
    "{\"cmdName\":\"enable_robot\"}",
    "{\"cmdName\":\"joint_move\",\"jointPosition\":[0,-30,-125,0,65,0],"
        + "\"speed\":500.0,\"relFlag\":0}"
};

for (String cmd : initialCommands) {
    sendCommand(socket, cmd);
    Thread.sleep(50);
}
```

### Python (마이그레이션 결과)

```python
# sync_robot_client.py — 초기화 시퀀스
init_commands = [
    '{"cmdName":"power_on"}',
    '{"cmdName":"enable_robot"}',
    '{"cmdName":"joint_move","jointPosition":[0,-30,-125,0,65,0],'
    '"speed":500.0,"relFlag":0}',
]

for cmd in init_commands:
    self.send_command(cmd)
    time.sleep(0.05)   # Java Thread.sleep(50) 과 동일
```

<div style="padding: 12px 0;"><div style="border-left: 3px solid #58a6ff; background: #0c2d6b; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#58a6ff;">포인트</strong> &mdash; 새로 쓴 코드가 더 "파이써닉" 하게 보인다고 <code>json.dumps({"cmdName": "power_on"})</code> 같이 바꾸지 않았다. JSON 직렬화 순서가 Python dict 삽입 순서에 묶이고, 키 따옴표 방식이 미묘하게 다를 가능성이 있어 <strong>원본 문자열 그대로 유지</strong>하는 쪽을 택했다. 검증이 끝난 다음에 바꿀 일이다.
</div></div>

---

## 원칙 2 — 파라미터 수치 1:1

Java 의 SystemConstant · TcpClient 에서 **하드코드된 수치들**을 Python settings 기본값으로 그대로 옮겼습니다.

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">의미</div>
    <div style="padding: 10px 14px; color: #f0883e;">Java (원본)</div>
    <div style="padding: 10px 14px; color: #3fb950;">Python (이식)</div>
    <div style="padding: 10px 14px;">비고</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">Home joint (deg)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">[0, -30, -125, 0, 65, 0]</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">[0, -30, -125, 0, 65, 0]</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 142-147</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">joint_move speed</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">500.0</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">500.0</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 144</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">moveL speed (mm/min)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">1800</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">1800</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 212</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">moveL accel (mm/s&sup2;)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">1100</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">1100</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 212</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">moveL tolerance (mm)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">0.5</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">0.5</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 212</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">명령 간 간격</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">Thread.sleep(50)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">time.sleep(0.05)</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 159 외 다수</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">홈 도달 판정 (deg)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">abs(diff) &lt;= 0.002</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">abs(diff) &lt;= 0.002</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 457-460</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">좌표 반올림</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">DecimalFormat "#.###"</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">round(x, 3)</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">Java line 443</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">응답 버퍼</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">new byte[2048]</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">bytearray(2048)</div>
    <div style="padding: 10px 14px; color: #484f58; font-size: 12px;">sendCommand</div>
  </div>
</div></div>

이걸 settings 에 기본값으로 박아두고, 운영 환경에서 조정이 필요하면 환경변수로 오버라이드하는 구조:

```python
# core/config.py — 기본값은 Java 와 동일
class Settings(BaseSettings):
    drawing_speed: float = 1800.0       # mm/min
    drawing_accel: float = 1100.0       # mm/s^2
    drawing_tolerance: float = 0.5      # mm
    joint_speed: float = 500.0          # deg/min
    # home_position 은 코드 상수로 유지 (절대 바꿀 이유가 없음)
```

---

## 원칙 3 — 타이밍 1:1 (왜 `time.sleep` 을 그대로 두는가)

동기 `time.sleep` 이 현대적 Python 코드에서 "냄새" 처럼 읽힐 수 있지만, 로봇 컨트롤러 상대로는 오히려 **의도적 여백**입니다.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">&check; 타이밍이 주는 것</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      &bull; 컨트롤러가 이전 명령을 큐에 제대로 넣을 시간<br/>
      &bull; TCP send/recv 사이의 버퍼 안정화<br/>
      &bull; 펌웨어 응답이 버스트로 몰렸을 때의 여유<br/>
      &bull; 장기간 검증된 수치 &rarr; 바꿀 이유가 없음
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 13px;">&times; "현대화" 했을 때의 위험</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9;">
      &bull; sleep 제거 &rarr; 명령 유실/순서 뒤섞임<br/>
      &bull; asyncio.sleep 전환 &rarr; 스케줄링 편차로 타이밍 흔들림<br/>
      &bull; send 즉시 recv &rarr; 느린 응답에서 socket.timeout<br/>
      &bull; 원본 동작과의 차이 디버깅이 로봇에서 이뤄져 비쌈
    </div>
  </div>

</div></div>

<div style="padding: 12px 0;"><div style="border-left: 3px solid #f0883e; background: #1c1206; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  "빠르게 고치고 싶다" 는 마음은 이해 가지만, <strong>마이그레이션 단계에서 할 일은 언어 이전 그 자체</strong>다. 타이밍 튜닝은 마이그레이션이 끝나고 <em>따로</em> 측정해서 바꾼다. 한 번에 둘을 같이 하면, 버그 원인을 "옮겨서" 인지 "바꿔서" 인지 구분할 수 없게 된다.
</div></div>

---

## 원칙 4 — 비동기로 안 바꿨다

FastAPI 위에서 돌고 있으니 처음엔 asyncio-native 로 다시 쓰고 싶었습니다. 하지만 **드로잉 세션 자체는 스레드로 남기고, FastAPI 엔드포인트에서 `asyncio.to_thread` 로 던지는** 구조를 택했습니다.

```python
# api/image_processing.py — async 엔드포인트에서 스레드로 실행
@router.post("/process-image")
async def process_image(req: ProcessRequest) -> ProcessResponse:
    # 이미지 파이프라인은 async 로
    commands = await pipeline.process_image_to_robot_commands(req.input_url)

    if req.auto_execute:
        # 로봇 실행은 백그라운드 스레드로 (이벤트 루프 블로킹 방지)
        session = session_manager.create(commands)
        session.start()   # daemon thread
        return ProcessResponse(session_id=session.id, status="running")

    return ProcessResponse(commands=commands)
```

이유:

1. **검증된 코드를 덜 건드린다** — 내부 로직(동기 socket, sleep, polling loop) 을 그대로 놔둘 수 있음.
2. **이벤트 루프를 절대 막지 않는다** — 스레드로 격리되어 수백 ms~수분짜리 드로잉이 다른 API 를 차단하지 않음.
3. **취소는 플래그로** — `DrawingSession._cancel_requested` 를 스레드가 주기적으로 체크. #07 에서 상세.

---

## 검증 체크리스트 — 마이그레이션 "끝" 의 정의

글이 아니라 **검증 스크립트**로 가지고 있는 체크리스트입니다.

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2.1;">
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>명령 시퀀스 동일</strong> — power_on / enable_robot / joint_move(home) 순서, 수 일치<br/>
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>페이로드 동일</strong> — JSON 키 순서, 숫자 포맷, 따옴표 스타일 (문자열 비교)<br/>
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>타이밍 동일</strong> — 명령 간 50ms, 홈 폴링 주기 50ms, 도달 판정 0.002°<br/>
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>응답 수신 동일</strong> — 2048 바이트 버퍼, UTF-8 디코딩<br/>
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>에러 처리 경로 동일</strong> — socket timeout / connection closed / errorCode != 0<br/>
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>좌표 반올림 동일</strong> — 세 자리 소수점 (<code>round(x, 3)</code>)<br/>
    <span style="color:#3fb950; font-weight: 700;">&#9745;</span> <strong>홈 복귀 타임아웃 동일</strong> — 최대 200회 (= 10초) 후 경고
  </div>
</div></div>

운영 환경에서 한 번 더 확인한 건:

- **실제 로봇에 Java 앱과 Python 서버를 번갈아 붙여** 동일 이미지를 돌려 **소요 시간/궤적/마지막 위치**를 비교.
- Gap 은 허용 오차 내 (&le; 1초, &le; 0.5mm 변위).

---

## 한계 — 지금 구조가 불편해지는 지점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 동기 소켓이 스레드를 잡음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      드로잉 세션 하나마다 스레드 1 개. 여러 세션이 동시에 돌 수 없음 (현재는 현장 한 곳당 로봇 1 대라 문제 없음).
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 명령이 문자열로 떠다님</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      f-string 으로 JSON 을 조립하는 지점이 몇 곳 남아 있음. 오타/타입 실수 위험. 타입 안전 명령 객체 필요.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 로봇 없으면 테스트 불가</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      가짜 컨트롤러가 없어서 유닛 테스트가 실제 하드웨어 의존. CI 에서 검증 불가 구간이 큼.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 타이밍이 여전히 Java 기준</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      50ms 가 네트워크 RTT 만 보면 과할 수 있음. 실제 최적값은 측정해서 바꿔야 하는데 측정 인프라가 아직 없음.
    </div>
  </div>

</div></div>

---

## 개선 방향 — 이제 "개선" 을 해도 되는 단계

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">단계 1 &middot; 타입 안전 명령 객체</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      문자열 조립을 없애고 <code>RobotCommand</code> pydantic 모델로 통일. 직렬화는 한 곳(<code>RobotCommand.to_wire()</code>) 에서만. 오타·타입 실수를 컴파일 타임에 잡음.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">단계 2 &middot; 가짜 컨트롤러 (테스트 더블)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>localhost:10001</code> 에 JAKA 응답을 흉내내는 python 서버. CI 에서 초기화 시퀀스 &middot; 홈 폴링 &middot; 에러 경로를 자동 검증. (#02 에서 상세)
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">단계 3 &middot; RobotClient 추상화</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      벤더 독립 인터페이스 (<code>connect / home / move_linear / stop</code>). JAKA 는 첫 구현체. 새 로봇 추가 시 한 파일만 더 쓰면 되도록.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">단계 4 &middot; 타이밍 측정 & 튜닝</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      명령별 컨트롤러 RTT 를 로깅하고 히스토그램으로 본다. sleep 값을 데이터 기반으로 조정. 바꾼 후에는 회귀 테스트 필수.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">단계 5 &middot; 선택적 async 전환</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      멀티 로봇/멀티 세션이 필요해질 때. 그 전까지는 스레드 + <code>to_thread</code> 로 충분. 필요하지 않은데 옮기지 않는다.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    이 글의 요지는 한 줄이다. &nbsp;<strong>"마이그레이션할 때는 옮기기만 한다. 개선은 옮기고 난 다음이다."</strong><br/>
    현장에서 검증된 코드는 보수적으로 다뤄야 하고, 타이밍이나 시퀀스는 <em>숫자를 바꾸기 전에 숫자의 의미</em>부터 알아야 한다. Java 원본을 Python 으로 1:1 옮긴 덕에, 이후에 하나씩 고치는 개선 로드맵이 안전하게 성립한다.
  </div>
</div></div>

---

## 다음 글

- [#02 — JAKA 컨트롤러 raw TCP/JSON 프로토콜 — SDK 가 아닌 이유](./2026-04-25-02-jaka-raw-tcp-protocol.md) &middot; 여기서 말한 "명령" 의 구체 포맷과, 자체 클라이언트 라이브러리로 분리하는 방향.

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
