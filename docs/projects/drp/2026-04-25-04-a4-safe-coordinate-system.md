# #04 — A4 안전 좌표계 — 픽셀, mm, 그리고 클램핑

> **DRP Engineering Notes · Episode 04** &middot; #03 에서 나온 "경로 리스트" 가 로봇 명령이 되는 마지막 관문. 이 글은 **이미지 평면의 (x, y) 픽셀이 어떻게 로봇의 6축 카테시안 공간으로 옮겨지는지**, 그리고 물리적 안전(종이 밖, 책상 밖, 팔 구속 위반) 을 어떻게 방어하는지 정리합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #3fb950; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0a2117, #04260f); padding: 14px 20px;">
    <span style="color: #3fb950; font-weight: 700; font-size: 15px;">A4 안전 좌표계 원칙</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">1.</span> <strong>이미지 중앙 영역만 사용</strong> — 입력 이미지의 중앙 50% 를 A4 그리기 영역에 매핑</div>
    <div><span style="color:#f0883e; font-weight: 700;">2.</span> <strong>2 층 스케일</strong> — 픽셀 &rarr; mm 변환(3.2) + 그림 자체 축소(0.85) + 사용영역 비율(0.85)</div>
    <div><span style="color:#3fb950; font-weight: 700;">3.</span> <strong>Z 축 분리</strong> — 그리기 높이(<code>line_to</code>) 와 이동 높이(<code>line_to + pen_lift_offset</code>) 를 명시적으로 둠</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">4.</span> <strong>하드 경계 클램핑</strong> — <code>safe_y_min/max</code>, <code>safe_z_min/max</code> 밖으로 나가는 명령은 생성 전에 잘림</div>
    <div><span style="color:#f778ba; font-weight: 700;">5.</span> <strong>Java 공식 보존</strong> — Android 원본과 동일한 <code>y = 90 - px/3.2</code>, <code>z = 320 - py/3.2</code> 유지</div>
  </div>
</div></div>

---

## 좌표계 3층 — 눈으로 보기

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 14px;">

  <div style="width: 100%; max-width: 720px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">&#128444; IMAGE SPACE (입력 이미지)</span>
      <span style="color: #8b949e; font-size: 11.5px;">pixel &middot; origin = 좌상단</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      Gemini 출력 PNG 는 대개 <strong>1024&times;1024 전후</strong>. 전체가 아니라 <strong>중앙 50% 영역</strong>만 A4 에 매핑 &mdash; 원본 가장자리의 여백/프레임을 안전하게 제거.
    </div>
  </div>

  <div style="color: #484f58; font-size: 22px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 720px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">&#128203; CANVAS SPACE (A4 평면)</span>
      <span style="color: #8b949e; font-size: 11.5px;">mm &middot; origin = 용지 중심</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      A4 = <strong>210 &times; 297 mm</strong>. 안전 마진 20mm 를 뺀 실제 그리기 영역은 <strong>150 &times; 200 mm</strong>. 추가로 <code>drawing_scale = 0.85</code> 로 10% 축소해 프레임 사고를 예방.
    </div>
  </div>

  <div style="color: #484f58; font-size: 22px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 720px; border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2a0f1f, #1a0a14); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">&#129302; ROBOT SPACE (JAKA TCP)</span>
      <span style="color: #8b949e; font-size: 11.5px;">mm, deg &middot; origin = 로봇 베이스</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      TCP pose = <code>[x, y, z, rx, ry, rz]</code>. 그리기 자세는 <strong>rx=0, ry=90, rz=0</strong> 고정(펜이 종이에 수직). X 는 <strong>로봇 앞쪽 400mm</strong> 근처 A4 중심. Z 는 <strong>line_to ≈ 364.5mm</strong> 를 기준 (실측으로 맞추는 값).
    </div>
  </div>

</div></div>

---

## 변환 공식 — Java 원본과 동일

Android 원본 `TcpClient.java` 의 두 줄이 모든 것의 출발점입니다:

```java
// 원본 Java — cartPosition 의 y, z 를 만들어낸다
double y = 90 - coordinate.get(1) / 3.2 + parseDoubleWithDefault(b, 0);
double z = 320 - coordinate.get(2) / 3.2 + parseDoubleWithDefault(a, 0);
```

Python 으로 옮긴 값은 그대로 상수화:

```python
# robot_coordinate_converter.py
self.y_offset = 50.0        # 원본 90 - 40(image_scale_factor 반영)
self.z_offset = 320.0
self.scale_factor = 3.2     # 픽셀 → mm (원본과 동일)
self.image_scale_factor = 0.4   # 이미지를 40% 로 축소해 안전 영역에 배치
```

<div style="padding: 12px 0;"><div style="border-left: 3px solid #f0883e; background: #1c1206; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#f0883e;">왜 3.2 인가</strong> &mdash; Java 원작자가 A4 에서 얼굴이 적절한 크기로 잡히도록 실측으로 튜닝한 값. 의미는 <em>"이미지 픽셀 3.2 개가 로봇 1 mm"</em>. DRP 는 이 단일 상수를 유지하되, 그림 전체를 추가로 작게 만드는 <code>drawing_scale</code> 를 위에 얹는다.
</div></div>

### 전체 변환을 한 줄 수식으로

```
# 픽셀 (px, py) → 로봇 카테시안 (x, y, z)
#   W, H = 이미지 가로·세로 픽셀
#   cx, cy = 이미지 중앙 (W/2, H/2)
#   dscale = drawing_scale (0.85)
#   usable = usable_area_ratio (0.85)

dx_mm = (px - cx) / scale_factor * dscale * usable    # 픽셀 → mm
dy_mm = (py - cy) / scale_factor * dscale * usable

robot_x = robot_x_center                              # 400mm 고정
robot_y = y_offset - dx_mm + center_shift_y           # A4 좌우 (수평)
robot_z = z_offset - dy_mm + center_shift_z           # A4 상하 (수직)
```

결과는 세 안전 범위 안으로 **클램핑** 후 `moveL` 명령에 실립니다.

---

## Z 축 — 그리기와 이동의 두 층

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">&#9999; Z_DRAW (선 그리는 높이)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <code>line_to &#8776; 364.5 mm</code><br/>
      종이 접촉 지점. 펜 캘리브레이션(#06) 결과로 자동 설정.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">&#11146; Z_TRAVEL (펜 든 이동 높이)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <code>line_to + pen_lift_offset &#8776; 379.5 mm</code><br/>
      <code>pen_lift_offset = 15 mm</code>. 예전 10 mm 에서 조정 &mdash; 종이 경사/버클링을 더 관대하게.
    </div>
  </div>

</div></div>

명령 생성 루프에서는 이 둘을 **엄격하게** 왕복합니다:

```text
for each path P:
  moveL(x=P[0].x, y=P[0].y, z=Z_TRAVEL)    # 경로 시작점 위로
  moveL(..., z=Z_DRAW)                     # 펜 내리기
  for p in P[1:]:
    moveL(x=p.x, y=p.y, z=Z_DRAW)          # 그리기
  moveL(..., z=Z_TRAVEL)                   # 펜 올리기
```

---

## 안전 경계 — 3 층 방어

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 10px;">

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #0c2d6b; border: 1px solid #58a6ff; display: flex; align-items: center; justify-content: center; color: #58a6ff; font-weight: 700; font-family: monospace;">1</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">소프트 마진 (usable_area_ratio + drawing_scale)</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">그림 자체가 안전 영역보다 작게 매핑되도록. 85% &times; 85% = 약 72% 만 사용. <strong>명령 생성 단계에서 사고 전에 멀어짐</strong>.</div>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #1c1206; border: 1px solid #f0883e; display: flex; align-items: center; justify-content: center; color: #f0883e; font-weight: 700; font-family: monospace;">2</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">하드 클램핑 (safe_y/z_min/max)</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">소프트 마진을 넘어도, 마지막에 <code>clamp(value, min, max)</code>. 좌표 튀는 패스(노이즈) 가 있어도 종이 밖으로 못 나감.</div>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #2a0f0f; border: 1px solid #f85149; display: flex; align-items: center; justify-content: center; color: #f85149; font-weight: 700; font-family: monospace;">3</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">로봇 자체 워크스페이스 (펌웨어)</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">JAKA 컨트롤러도 범위 밖 <code>moveL</code> 은 거부. 우리는 그 전에 막되 <strong>로봇 쪽 방어도 켜 두는</strong> 다중 보호.</div>
    </div>
  </div>

</div></div>

### 실제 상수 표

<div style="padding: 12px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden; background: #0d1117;">
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; background: #161b22; border-bottom: 1px solid #30363d; color: #8b949e; font-size: 12px; font-weight: 600;">
    <div style="padding: 10px 14px;">항목</div>
    <div style="padding: 10px 14px;">값</div>
    <div style="padding: 10px 14px;">설명</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">A4 크기</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">210 &times; 297 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">물리 종이</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">Safety margin</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">20 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">가장자리 제외</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">Drawing area</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">150 &times; 200 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">실제 그릴 영역</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">Robot center (X, Y)</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">(400, 0)</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">로봇 앞 A4 중심</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">safe_y min/max</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">-110 / 90 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">수평 하드 클램프</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">safe_z min/max</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">-25 / 280 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">수직 하드 클램프</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">drawing_scale</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">0.85</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">그림 자체 10% 축소</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">usable_area_ratio</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">0.85</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">사용 영역 비율</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">center_shift_z_ratio</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">0.8</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">그림을 위쪽으로 밀기</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">bottom_clearance_z</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">30 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">하단 최소 이격</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; border-bottom: 1px solid #21262d;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">pen_lift_offset</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">15 mm</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">이동 시 펜 높이</div>
  </div>
  <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr;">
    <div style="padding: 8px 14px; color: #e6edf3; font-size: 13px;">drawing 자세 (rx, ry, rz)</div>
    <div style="padding: 8px 14px; color: #8b949e; font-size: 12.5px; font-family: monospace;">(0, 90, 0)</div>
    <div style="padding: 8px 14px; color: #484f58; font-size: 12px;">펜이 종이에 수직</div>
  </div>
</div></div>

---

## "보이지 않는" 설계 포인트 3 가지

### 1) `min_move_epsilon` — 0 길이 이동 제거

```python
self.min_move_epsilon = 0.1  # 0.2 → 0.1 (경로 연속성 보장)
```

`moveL` 목표점이 현재 위치와 **0.1 mm 미만** 이면 그 명령을 건너뜁니다. 컨트롤러가 "의미 없는 이동" 을 처리하면서 생기는 응답 지연 / 미세 떨림을 줄임. 이 값이 너무 크면(0.5+) 실제 짧은 선이 사라져 점선 효과가 납니다.

### 2) 그림의 수직 중앙 — 현장은 "위쪽 중앙" 을 선호

```python
self.center_shift_z_ratio = 0.8  # 그림을 상단 쪽으로 올림
```

사람은 종이 한 가운데보다 **살짝 위쪽** 에 얼굴이 있는 구도를 선호. 현장 피드백 반영 상수. 값이 클수록 그림이 위로.

### 3) 드로잉 자세 고정 — `rx=0, ry=90, rz=0`

로봇 팔은 6DOF 지만 드로잉 중에는 **자세(orientation)** 를 절대 바꾸지 않습니다. 펜 방향이 항상 종이 수직을 유지해야 필압/선 두께가 일정. 자세 변환은 캘리브레이션 타임에만.

---

## 한계 — 지금 좌표계의 약점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; A4 하드코드</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      캔버스 크기와 안전 영역이 전부 상수. A3, B5, 캔버스 천, 엽서 크기 등을 쓰려면 지금은 코드 수정이 필요.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 평면 가정</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Z 가 <strong>단일 상수</strong>. 실제로는 종이가 미세하게 휘거나 책상이 살짝 기울어 있을 수 있지만 고려 안 함. 눈에 거의 안 보이는 종이 버클링이 선 끊김을 유발.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 클램핑이 "자른다"</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      경계 밖 점을 만나면 경계선에 딱 붙여 버림 &rarr; 경계에 점이 겹치면 <strong>세로 직선</strong> 처럼 찍힘. 드물지만 벡터화 튐이 있는 이미지에서 눈에 띔.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 상수 매직 넘버</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>3.2</code>, <code>0.85</code>, <code>0.4</code>, <code>50</code>, <code>320</code>… 각 상수의 의미가 코드 주석에만 분산. "왜 이 값이 이것이냐" 문서가 없음.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">&#9888; Dry-run 부재 (계속)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      좌표 변환 결과가 <strong>올바른지</strong> 확인할 수 있는 건 로봇뿐. 상수 하나 바꾸고도 실제로 찍어봐야 결과를 알 수 있음.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 14px;">&#9888; 자세가 고정</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>(rx=0, ry=90, rz=0)</code> 고정이라 기울어진 캔버스(이젤) 에 못 씀. 새 사용처에선 자세도 계산해야 할 것.
    </div>
  </div>

</div></div>

---

## 개선 방향 — 좌표계를 "설정" 으로 끌어올리기

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; Canvas 타입 추상화</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>Canvas</code> pydantic 모델 (name · width_mm · height_mm · origin_xyz · orientation_rxryrz · safe_bounds). A4 는 <code>CANVAS_A4</code> 프리셋. A3/엽서/이젤 각각 프리셋. <strong>변환 코드는 Canvas 한 개만 받게</strong> 리팩토링.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; Dry-run 좌표 검증기 (#03 과 공유)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      RobotCommand 리스트를 받아 <strong>실제 종이 위에 찍힐 점들을 SVG 렌더</strong>. 안전 경계선/마진 박스/중심선도 같이 그려서 "클램핑된 점" 을 다른 색으로 표시. 로봇 없이 좌표계 튜닝.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; 3점 평면 보정</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      Z 를 상수가 아닌 <strong>평면 함수 z(x, y)</strong> 로. 종이의 세 귀퉁이 실측 후 평면 방정식을 풀어 각 좌표의 적정 Z 를 산출. 종이 살짝 기울어진 현장에서도 선 품질 개선.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 클램핑 → 리플로우</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      경계 밖 점은 "자르기" 대신 <strong>경로를 잘라 두 부분으로 분할</strong>. 넘어간 구간은 스킵(penUp) 하고 안전 영역 복귀 시 다시 penDown. 세로선 인공물 제거.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; 상수를 "문서화된 설정" 으로</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      각 상수에 <strong>"왜 이 값인가" 주석 + 실측 근거</strong> 를 붙여 <code>docs/coordinate-system.md</code> 에 정리. 새 현장/새 로봇 세팅 시 참고서 역할.
    </div>
  </div>

  <div style="border: 1px solid #f85149; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700;">6 &middot; 자세 자동 계산 (미래 대비)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      캔버스 법선 벡터 &rarr; 자세(Euler). 기울어진 보드/이젤 지원의 기초. 지금 필요한 기능은 아니지만 Canvas 추상화와 함께 설계해 두면 확장 비용 감소.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    좌표계 코드는 겉으로는 <em>수식 몇 줄</em>처럼 보이지만, 실제로는 "<strong>안전한 그림을 보장한다</strong>" 는 약속을 코드로 쓰는 곳이다. 지금 DRP 의 좌표계는 Java 원본을 보존하면서 3층 방어(소프트 마진/하드 클램프/펌웨어) 를 얹어 운영을 견디고 있다. 다음 단계는 이 "<strong>약속을 문서로 드러내고, 캔버스를 설정화하는 것</strong>" &mdash; 자체 실력보다 협업 가능성을 위해서.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#03 — 이미지 → 벡터 → 로봇 명령 풀 파이프라인](./2026-04-25-03-image-to-robot-pipeline.md)
- 다음: [#05 — AI 라인 드로잉 (Gemini 2.5 Flash Image)](./2026-04-25-05-ai-line-drawing-gemini.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
