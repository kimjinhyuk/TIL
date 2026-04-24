# #02 — JAKA 컨트롤러 raw TCP/JSON 프로토콜 — SDK 가 아닌 이유

> **DRP Engineering Notes · Episode 02** &middot; #01 에서 "Java 원본의 동작을 1:1 이식했다" 고 했습니다. 이 글은 그 바닥에서 실제로 오가는 **바이트**를 들여다봅니다 — 어떤 포트, 어떤 JSON, 어떤 에러 코드. 그리고 왜 JAKA 공식 SDK 를 쓰지 않고 **소켓을 직접** 다루는지, 대신 어떻게 테스트 가능하게 만들 것인지.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 14px 20px;">
    <span style="color: #d2a8ff; font-weight: 700; font-size: 15px;">JAKA 컨트롤러 프로토콜 요약</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">포트</span> &nbsp;<code>TCP 10001</code> (로봇 컨트롤러 IP 기준)</div>
    <div><span style="color:#f0883e; font-weight: 700;">포맷</span> &nbsp;요청/응답 모두 <strong>단일 JSON 객체</strong> &middot; UTF-8 &middot; 구분자/길이 프레이밍 없음 (한 번의 recv = 한 응답)</div>
    <div><span style="color:#3fb950; font-weight: 700;">요청</span> &nbsp;<code>{"cmdName": &lt;name&gt;, ...args}</code></div>
    <div><span style="color:#d2a8ff; font-weight: 700;">응답</span> &nbsp;<code>{"errorCode": "0" 또는 실패코드, ...payload}</code></div>
    <div><span style="color:#f778ba; font-weight: 700;">선택</span> &nbsp;<strong>SDK 없이 소켓 직통</strong> — 원본 Java 와 호환 + Alpine 이미지 빌드 + 의존성 0</div>
  </div>
</div></div>

---

## 왜 SDK 가 아닌가

JAKA 는 공식 SDK (C++ 기반, Python 바인딩 포함) 를 제공합니다. 그런데 DRP 는 의도적으로 쓰지 않습니다. 이유를 네 가지 카드로:

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">&check; Java 원본과 1:1 호환</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      원본 Android 앱이 이미 socket 직통. SDK 를 끼우면 명령 포맷/타이밍이 SDK 스타일로 바뀌어 <strong>동작 동치 검증</strong>이 무너짐.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">&check; 의존성 0</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <code>socket</code> + <code>json</code> 표준 라이브러리. 네이티브 빌드 체인 / 별도 wheel / 버전 매칭 스트레스 없음. <strong>Alpine</strong> 기반 이미지 가능.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">&check; 프로토콜이 단순</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      명령 10개 안쪽. JSON 한 객체 송수신. SDK 의 두툼한 추상화보다 <strong>직접 들여다보는 쪽이 디버깅이 빠름</strong>.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">&check; 모킹이 쉬움</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      포트 하나에 JSON 을 받아 JSON 을 돌려주는 <strong>fake 서버</strong>를 200 줄 안쪽으로 만들 수 있음. SDK 는 내부 상태 재현이 어려움.
    </div>
  </div>

</div></div>

<div style="padding: 12px 0;"><div style="border-left: 3px solid #f85149; background: #2a0f0f; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#f85149;">단, SDK 가 더 나을 장면도 있다</strong> &mdash; Impedance control, force/torque 센서 통합, 궤적 계획 같은 고급 제어. 지금 DRP 가 요구하는 건 <em>점과 점을 잇는 직선 이동</em> 수준이라, 프로토콜 직통이 간결하다.
</div></div>

---

## 프로토콜 한 사이클

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="width: 100%; max-width: 620px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; text-align: center;">
      <span style="color: #58a6ff; font-weight: 700;">&#9312; 연결</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      socket.connect((robot_ip, 10001)) &middot; settimeout(30s)
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 620px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; text-align: center;">
      <span style="color: #f0883e; font-weight: 700;">&#9313; 송신</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      socket.send(b'{"cmdName":"power_on"}')
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 620px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; text-align: center;">
      <span style="color: #3fb950; font-weight: 700;">&#9314; 수신 (2KB 버퍼, 단일 recv)</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      buf = bytearray(2048) &middot; n = socket.recv_into(buf) &middot; buf[:n].decode('utf-8')
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 620px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; text-align: center;">
      <span style="color: #d2a8ff; font-weight: 700;">&#9315; 파싱 + errorCode 확인</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      json.loads(resp).get("errorCode") == "0"
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 620px; border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; text-align: center;">
      <span style="color: #f778ba; font-weight: 700;">&#9316; 다음 명령까지 50ms</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.9; font-family: monospace;">
      time.sleep(0.05)
    </div>
  </div>

</div></div>

<div style="padding: 12px 0;"><div style="border-left: 3px solid #f0883e; background: #1c1206; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#f0883e;">프레이밍 없음</strong> &mdash; JAKA 는 길이 prefix 도, 줄바꿈 구분자도 주지 않는다. 한 번 <code>send</code> 하고 한 번 <code>recv</code> 한다는 "요청 하나 &rarr; 응답 하나" 의 암묵 규약 위에서 돈다. 그래서 <strong>여러 명령을 한 번에 붙여 보내면 안 된다</strong>.
</div></div>

---

## 명령 카탈로그

DRP 가 실제로 쓰는 명령 전부. 이걸 코드에서 찾아 한 표로 묶어둡니다.

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">cmdName</div>
    <div style="padding: 10px 14px;">용도</div>
    <div style="padding: 10px 14px;">페이로드</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e; font-family: monospace; font-size: 12.5px;">power_on</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">로봇 전원 ON</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e; font-family: monospace; font-size: 12.5px;">enable_robot</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">서보 활성화</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #58a6ff; font-family: monospace; font-size: 12.5px;">joint_move</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">관절 공간 이동 (홈 복귀/프리셋)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">jointPosition[6] &middot; speed &middot; relFlag</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #58a6ff; font-family: monospace; font-size: 12.5px;">moveL</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">직선 이동 (드로잉의 본체)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">cartPosition[6] &middot; speed &middot; accel &middot; tol &middot; relFlag</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace; font-size: 12.5px;">get_joint_pos</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">현재 관절 위치 조회 (홈 도달 판정)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace; font-size: 12.5px;">get_tcp_pos</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">현재 TCP(툴) 위치 조회 (캘리브레이션)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace; font-size: 12.5px;">get_user_offsets</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">사용자 좌표계 오프셋 조회</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace; font-size: 12.5px;">get_program_state</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">프로그램 실행 상태 조회</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f85149; font-family: monospace; font-size: 12.5px;">stop_program</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">프로그램 정지 (전원/서보 유지)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.4fr 1.8fr;">
    <div style="padding: 10px 14px; color: #f85149; font-family: monospace; font-size: 12.5px;">pause_program</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">프로그램 일시정지 (일부 펌웨어 호환)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12px; font-family: monospace;">&mdash;</div>
  </div>

</div></div>

### 페이로드 상세 — 자주 쓰는 둘

#### `joint_move` — 6축 관절 각도로 이동

```json
{
  "cmdName": "joint_move",
  "jointPosition": [0, -30, -125, 0, 65, 0],
  "speed": 500.0,
  "relFlag": 0
}
```

- `jointPosition` — 각 관절의 각도 (deg). 홈 프리셋은 `[0, -30, -125, 0, 65, 0]`.
- `speed` — 관절 속도 (deg/min).
- `relFlag` — 0 = 절대, 1 = 상대.

#### `moveL` — 카테시안 직선 이동

```json
{
  "cmdName": "moveL",
  "cartPosition": [400.0, -10.0, 312.5, 180.0, 0.0, 0.0],
  "speed": 1800.0,
  "accel": 1100.0,
  "tol": 0.5,
  "relFlag": 0
}
```

- `cartPosition` — `[x, y, z, rx, ry, rz]` (mm, deg).
- `speed` — mm/min. DRP 는 1800 (운영값).
- `accel` — mm/s&sup2;. DRP 는 1100.
- `tol` — 블렌딩 허용 반경 (mm). 다음 점까지 이 거리 내로 들어오면 보간.

---

## 응답 — 성공/실패의 유일한 단서 `errorCode`

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1fr 2fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">errorCode</div>
    <div style="padding: 10px 14px;">의미</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #3fb950; font-family: monospace; font-size: 13px;">"0"</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">성공 (문자열 리터럴 "0", 숫자가 아님)</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #f0883e; font-family: monospace; font-size: 13px;">그 외 문자열</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">컨트롤러/펌웨어 특정 에러 코드 (벤더 매뉴얼 대조)</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 2fr;">
    <div style="padding: 10px 14px; color: #f85149; font-family: monospace; font-size: 13px;">없음 / 형식 오류</div>
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">네트워크/프로토콜 문제로 간주하고 클라이언트 단에서 실패 처리</div>
  </div>
</div></div>

Python 쪽에서는 이렇게 다룹니다:

```python
# sync_robot_client.py — 응답 후처리
def _parse_error_code(self, response: str) -> str:
    try:
        response_json = json.loads(response)
    except json.JSONDecodeError:
        return "1"  # 파싱 실패 = 실패로 취급
    error_code = response_json.get("errorCode", "1")
    return str(error_code)


# 성공 판정 예
success = json.loads(response).get("errorCode") == "0"
```

---

## 자주 마주친 함정

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 13px;">&#9888; errorCode 는 문자열</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      <code>== 0</code> 로 비교하면 항상 False. 반드시 <code>== "0"</code>. int 비교 취급을 하고 싶다면 명시적으로 캐스팅.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">&#9888; 한 번에 recv 가 다 안 올 수도</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      2KB 이내면 사실상 1회 recv 로 충분하지만, TCP 는 근본적으로 스트림이다. 응답이 길어질 가능성이 있으면 <strong>종료 조건 (길이 or 닫는 중괄호)</strong> 기반 loop 로.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">&#9888; 명령을 붙여 보내면 응답이 섞임</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      send &rarr; recv &rarr; 50ms 간격을 반드시 유지. 여러 명령을 묶어 한 번에 write 하면 다음 recv 에서 여러 JSON 이 붙어 오거나 잘려 옴.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">&#9888; 타임아웃은 동작 길이 기준으로</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      그리기 중 <code>moveL</code> 응답은 길게는 수 초까지 지연. socket timeout 을 <strong>30초</strong>로 넉넉하게. 너무 짧으면 정상 동작도 실패로 찍힘.
    </div>
  </div>

</div></div>

---

## SDK vs Raw — 어디서 갈라지는가

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">기준</div>
    <div style="padding: 10px 14px; color: #d2a8ff;">Raw TCP/JSON</div>
    <div style="padding: 10px 14px; color: #f0883e;">JAKA SDK</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">설치 / 의존성</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">0 (표준 lib)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">네이티브 바인딩, 플랫폼별 wheel</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">학습 곡선</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">낮음 (명령 10 개)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">중 (내부 상태/예외 구조)</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">테스트 (fake)</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">TCP 서버 한 개로 충분</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">SDK 모킹은 별도 작업</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">고급 제어</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">직접 구현 필요</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">&check; 궤적/force 내장</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">벤더 교체</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">명령 어댑터만 교체</div>
    <div style="padding: 10px 14px; color: #8b949e; font-size: 12.5px;">SDK 전체 재학습</div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr;">
    <div style="padding: 10px 14px; color: #e6edf3; font-size: 13px;">이 프로젝트에 적합?</div>
    <div style="padding: 10px 14px; color: #3fb950; font-size: 12.5px;">&check; 지금 상황에 맞음</div>
    <div style="padding: 10px 14px; color: #f0883e; font-size: 12.5px;">&mdash; force/궤적이 필요해질 때</div>
  </div>
</div></div>

---

## 가짜 컨트롤러 — CI 에서 실로봇 없이 돌리기

지금 DRP 에서 가장 큰 테스트 공백은 "**로봇이 없으면 아무것도 못 한다**" 입니다. 프로토콜이 이렇게 단순하기 때문에 — **fake 서버로 대체 가능**합니다.

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="width: 100%; max-width: 640px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; text-align: center;">
      <span style="color: #3fb950; font-weight: 700;">FakeJakaController (localhost:10001)</span>
    </div>
    <div style="padding: 12px; background: #0d1117;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
        <div style="border: 1px solid #30363d; border-radius: 6px; padding: 10px; background: #161b22;">
          <div style="color:#3fb950; font-weight: 600; font-size: 12.5px;">상태 기계</div>
          <div style="color:#8b949e; font-size: 11.5px; margin-top: 3px;">off &rarr; on &rarr; enabled &rarr; ready &rarr; moving</div>
        </div>
        <div style="border: 1px solid #30363d; border-radius: 6px; padding: 10px; background: #161b22;">
          <div style="color:#58a6ff; font-weight: 600; font-size: 12.5px;">관절/TCP 시뮬</div>
          <div style="color:#8b949e; font-size: 11.5px; margin-top: 3px;">joint_move &rarr; 가상 위치 갱신</div>
        </div>
        <div style="border: 1px solid #30363d; border-radius: 6px; padding: 10px; background: #161b22;">
          <div style="color:#f0883e; font-weight: 600; font-size: 12.5px;">이상 주입</div>
          <div style="color:#8b949e; font-size: 11.5px; margin-top: 3px;">timeout / errorCode != "0" 시나리오</div>
        </div>
        <div style="border: 1px solid #30363d; border-radius: 6px; padding: 10px; background: #161b22;">
          <div style="color:#d2a8ff; font-weight: 600; font-size: 12.5px;">타이밍 시뮬</div>
          <div style="color:#8b949e; font-size: 11.5px; margin-top: 3px;">moveL 은 거리에 비례한 지연 반환</div>
        </div>
      </div>
    </div>
  </div>

</div></div>

뼈대 코드 (200 줄 안쪽 target):

```python
# tests/fake_jaka_controller.py — 프로토콜만 흉내내는 가짜 서버
import asyncio
import json

class FakeJakaController:
    def __init__(self):
        self.powered = False
        self.enabled = False
        self.joint = [0, -30, -125, 0, 65, 0]  # 홈에서 시작
        self.tcp = [400.0, 0.0, 322.5, 180.0, 0.0, 0.0]

    async def handle(self, reader, writer):
        while data := await reader.read(2048):
            req = json.loads(data.decode())
            resp = self._route(req)
            writer.write(json.dumps(resp).encode())
            await writer.drain()

    def _route(self, req: dict) -> dict:
        match req.get("cmdName"):
            case "power_on":      self.powered = True;  return {"errorCode": "0"}
            case "enable_robot":  self.enabled = True;  return {"errorCode": "0"}
            case "joint_move":
                if not self.enabled:
                    return {"errorCode": "E_NOT_ENABLED"}
                self.joint = req["jointPosition"]
                return {"errorCode": "0"}
            case "moveL":
                # TCP 를 요청된 cartPosition 으로 갱신
                self.tcp = req["cartPosition"]
                return {"errorCode": "0"}
            case "get_joint_pos": return {"errorCode": "0", "jointPos": self.joint}
            case "get_tcp_pos":   return {"errorCode": "0", "tcpPos": self.tcp}
            case "stop_program":  return {"errorCode": "0"}
            case _:               return {"errorCode": "E_UNKNOWN_CMD"}


async def main():
    server = await asyncio.start_server(
        FakeJakaController().handle, "127.0.0.1", 10001
    )
    async with server: await server.serve_forever()

# pytest fixture 에서 asyncio.create_task(main()) 로 띄우고 테스트 진행
```

이게 있으면:

- **초기화 시퀀스 회귀 테스트** — power_on &rarr; enable_robot &rarr; joint_move 순서 강제
- **홈 복귀 폴링 종료 조건 검증** — `get_joint_pos` 를 반복하며 홈 도달까지 수렴하는지
- **에러 경로 검증** — `E_NOT_ENABLED` 같은 코드로 실패 분기
- **속도 회귀 방지** — 명령 송수신 레이턴시 기록

CI 에서 실하드웨어 없이 이 전부를 돌릴 수 있어집니다.

---

## 한계 — 지금 이 프로토콜 코드의 약점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">1. 프레이밍 취약</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "한 번 recv = 한 응답" 가정이 TCP 에서 절대적이지 않다. 큰 응답에서는 조각이 나올 수 있음.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">2. 에러 코드가 구전</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "0" 이 아니면 실패라는 것만 코드에 있음. 코드별 의미/대응이 매뉴얼에 흩어져 있음.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">3. 타입 안전성 없음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      명령을 f-string 으로 조립하는 자리가 일부 남아 있어 오타/단위 실수 위험.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">4. 벤더 독립성 없음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      UR, Doosan 등이 들어오면 <code>services/robot/</code> 전체를 두 벌로 두어야 함 &mdash; 추상화가 시급.
    </div>
  </div>

</div></div>

---

## 개선 방향 — `jaka-py` 라는 작은 클라이언트 라이브러리

시리즈 끝까지 남기고 갈 가장 큰 투자 방향입니다. 지금의 `sync_robot_client.py` 를 **자체 독립 라이브러리**로 분리.

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; 타입 안전 명령 객체</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>PowerOn</code> / <code>EnableRobot</code> / <code>JointMove(pos: tuple[float,...], speed: float)</code> / <code>MoveL(cart: ...)</code>. pydantic 모델로 통일. 직렬화는 한 지점에서만. 단위(mm, deg) 를 타입으로 분리.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; 에러코드 카탈로그</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      알려진 코드를 <code>JakaError</code> enum/문서로 정리. 매핑되지 않는 코드는 <code>JakaUnknownError(code)</code>. 매뉴얼과 실전 로그를 합쳐 계속 갱신.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; 견고한 프레이밍</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <strong>괄호 매칭 기반 JSON 파서</strong>로 recv loop 를 감싼다. 여러 recv 에 걸쳐 오는 응답을 안전하게 하나로 모음.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 추상 RobotClient 인터페이스</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>connect / home / move_linear / stop / get_tcp</code>. JAKA 는 첫 구현. 새 로봇 벤더가 붙을 때 어댑터 하나만 작성.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; pytest 용 fake 내장</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>jaka_py.testing.FakeController</code> 로 import. pytest fixture 하나로 localhost:10001 에 띄우고 내리기. CI 통과 조건을 프로토콜 호환으로 둠.
    </div>
  </div>

</div></div>

라이브러리로 분리해 두면 — DRP 말고 다음 프로젝트에서도 재사용할 수 있고, 무엇보다 **사내 "로봇 제어 표준 스택"** 의 기초가 됩니다.

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    SDK 를 쓰지 않는 이유는 <em>반대</em>가 아니다 — <strong>우리 상황엔 raw 가 더 맞았을 뿐</strong>이다. 프로토콜이 단순하고, 원본과의 호환이 중요하고, 의존성과 테스트 경로가 깨끗한 것이 더 큰 가치였다. 대신 그만큼 <strong>명세를 직접 관리</strong>해야 하고, <strong>테스트 더블을 직접 만들어야</strong> 한다. 지금의 DRP 는 전자는 했고 후자는 아직이다 — 다음 시즌의 가장 큰 숙제.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#01 — Java TcpClient → Python 마이그레이션](./2026-04-25-01-java-to-python-migration.md)
- 다음: **#03 — 이미지 → 벡터 → 로봇 명령 풀 파이프라인** (예정)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
