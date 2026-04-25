# #06 — 펜 자동 캘리브레이션

> **DRP Engineering Notes · Episode 06** &middot; 펜은 매번 다릅니다. 길이도, 마모 정도도, 끼우는 깊이도. 종이 두께도 다르고 책상도 미세하게 흔들립니다. 그런데 로봇 좌표계의 Z 축은 한 상수(`line_to`) 로 고정되어 있어야 합니다. 이 글은 **로봇이 펜을 직접 누르며 스크린 접촉 X 좌표를 자동 측정**해 SQLite 에 저장하는 캘리브레이션 알고리즘을 정리합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #f778ba; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2a0f1f, #1a0a14); padding: 14px 20px;">
    <span style="color: #f778ba; font-weight: 700; font-size: 15px;">펜 자동 캘리브레이션</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">목적</span> &nbsp;매번 다른 펜 길이/종이 두께를 <strong>로봇이 직접 측정</strong>하고 결과를 <code>line_to</code> 로 적용</div>
    <div><span style="color:#f0883e; font-weight: 700;">알고리즘</span> &nbsp;<strong>5 단계 직진 접촉</strong> — TCP 조회 → 자세 보정 → 전진 → 접촉점 측정 → 원위치</div>
    <div><span style="color:#3fb950; font-weight: 700;">영속화</span> &nbsp;<strong>SQLite (Singleton + thread-local connection)</strong> 으로 재기동 후에도 유지</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">결과</span> &nbsp;<code>line_to = final_x</code>, <code>move_to = final_x &minus; pen_lift_offset(15mm)</code></div>
  </div>
</div></div>

---

## 왜 자동이어야 하는가

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">&#9999; 펜 길이 변동</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      교체 시 잡는 깊이가 ±2~5mm. 수동 입력은 매번 사람 개입.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">&#128203; 종이 두께 / 책상 표면</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      A4 일반 80g vs 두꺼운 220g 만으로도 0.2~0.3mm 차이. 책상 패드 유무도.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">&#129302; 로봇 자세 미세 변형</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      이송 충격/일자세 누적으로 베이스 위치가 0.x mm 단위로 흔들릴 수 있음.
    </div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 13px;">&#9888; 잘못 잡힌 Z 의 결과</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      너무 깊으면 종이 찢김/펜 부러짐, 너무 얕으면 빈 자국. <strong>현장 사고로 직결</strong>.
    </div>
  </div>

</div></div>

---

## 5 단계 직진 접촉 알고리즘

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="width: 100%; max-width: 640px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">&#9312; 현재 TCP 위치 조회</span>
      <span style="color: #8b949e; font-size: 11.5px;">get_tcp_pos</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      JAKA 컨트롤러에서 현재 6축 TCP pose 를 가져옴. 측정 기준점.
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">&#9313; 자세 보정 (rx, ry, rz) = (0, 90, 0)</span>
      <span style="color: #8b949e; font-size: 11.5px;">moveL</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      펜이 정확히 종이 수직 자세로 가야 측정값이 의미 있음. 위치(x, y, z) 는 유지.
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">&#9314; X 축 +11 mm 천천히 전진</span>
      <span style="color: #8b949e; font-size: 11.5px;">moveL slow</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      펜을 스크린(또는 종이) 쪽으로 밀어 접촉. <strong>천천히</strong> 가서 충격 최소화. 컨트롤러는 종이에 막힌 시점까지 진행.
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">&#9315; 1초 안정화 후 TCP 재조회 → final_x</span>
      <span style="color: #8b949e; font-size: 11.5px;">get_tcp_pos</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      안정화 sleep 1.0s 후 측정. 이때 X 가 <strong>실제 접촉 위치</strong>. 종이 표면이 펜을 멈춘 그 좌표.
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 640px; border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">&#9316; 원위치 복귀 + SQLite 저장</span>
      <span style="color: #8b949e; font-size: 11.5px;">moveL + persist</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.7;">
      처음 위치로 돌아가 안전 자세. <code>line_to = final_x</code>, <code>move_to = final_x &minus; 15</code> 를 SQLite 에 저장.
    </div>
  </div>

</div></div>

### 핵심 코드

```python
# pen_calibration.py — auto_calibration() 요약
def auto_calibration(self) -> Optional[float]:
    # 1. 현재 TCP
    current = self._get_tcp_position()         # [x, y, z, rx, ry, rz]
    if not current:
        return None

    # 2. 자세 보정 (위치 유지, rx=0, ry=90, rz=0)
    self._move_to_position([
        current[0], current[1], current[2], 0, 90, 0
    ])
    time.sleep(0.5)

    # 3. X 축 +11mm 전진 (slow)
    self._move_to_position_slow([
        current[0] + 11.0, current[1], current[2], 0, 90, 0
    ])
    time.sleep(1.0)   # 접촉 안정화

    # 4. 접촉 후 TCP 재조회
    contact = self._get_tcp_position()
    final_x = contact[0]

    # 5. 원위치 복귀 + 결과
    self._move_to_position(current)
    time.sleep(0.5)
    return final_x
```

API 엔드포인트는 이 결과를 받아 두 값을 SQLite 에 저장합니다:

```python
# api/robot_calibration.py
final_x = pen_calibration.auto_calibration()
line_to = final_x
move_to = final_x - 10.0   # pen_lift_offset

save_calibration_values(line_to, move_to)
return {"line_to": line_to, "move_to": move_to}
```

---

## 영속화 — SQLite 한 통, 스레드 안전

`pen_calibration_store.py` 는 다음 패턴으로 동시 접근을 안전하게 다룹니다:

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">Singleton (double-checked locking)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <code>_instance</code> + <code>_lock</code> 으로 첫 인스턴스만 스키마 초기화. 이후 호출은 잠금 없이 통과.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">Thread-local connection</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <code>threading.local()</code> 에 conn 1 개씩. 스레드별 격리, SQLite 의 <em>same-thread 체크</em> 회피.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">timeout=10s</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      락 충돌 시 최대 10초 대기 후 실패. 일시 점유는 흡수.
    </div>
  </div>

</div></div>

---

## 사용 흐름 — 어디서 호출되는가

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="border: 2px solid #58a6ff; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #1f3a5f, #1a2744); text-align: center;">
    <span style="color: #58a6ff; font-weight: 700;">&#9881; 운영자 — 현장 셋업 시 1회</span>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 580px; border: 1px solid #f0883e; border-radius: 10px; padding: 10px 14px; background: #1c1206; text-align: center; color: #f0883e; font-weight: 600; font-size: 13px;">
    POST /api/v1/robot/calibrate-pen
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 580px; border: 1px solid #3fb950; border-radius: 10px; padding: 10px 14px; background: #04260f; text-align: center; color: #3fb950; font-weight: 600; font-size: 13px;">
    PenCalibration.auto_calibration() — 5단계 직진 접촉
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 580px; border: 1px solid #d2a8ff; border-radius: 10px; padding: 10px 14px; background: #1a0e30; text-align: center; color: #d2a8ff; font-weight: 600; font-size: 13px;">
    save_calibration_values(line_to, move_to) — SQLite 영속화
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="border: 2px solid #f778ba; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #2a0f1f, #1a0a14); text-align: center;">
    <span style="color: #f778ba; font-weight: 700;">&#129302; 이후 모든 드로잉이 새 line_to 사용 (#04 좌표 변환)</span>
  </div>

</div></div>

`ImageProcessor` 가 부팅 시 자동으로 캘리브레이션 값을 로드해 `RobotCoordinateConverter` 에 주입하는 부분이 핵심:

```python
# image_processor.py — 부팅 시 캘리브레이션 자동 적용
def _load_pen_calibration(self):
    status = get_calibration_status()
    if status.get("calibrated"):
        line_to, move_to = load_calibration_values()
        pen_cal = PenCalibration(robot_client=None)
        pen_cal.set_pen_positions(move_to, line_to)
        self.coordinate_converter.set_pen_calibration(pen_cal)
        logger.info(f"캘리브레이션 적용: line_to={line_to}, move_to={move_to}")
    else:
        logger.warning("캘리브레이션 미완료 — POST /robot/calibrate-pen 필요")
```

---

## 또 하나의 옵션 — 3 점 평면 보정 (잠재 기능)

코드에는 `_fit_plane(pts)` 와 `_calculate_plane_correction(points)` 가 이미 들어있습니다. 종이의 **세 귀퉁이 X 좌표를 측정**해 평면 방정식 `ax + by + cz = d` 를 풀면, 위치별 적정 Z 를 함수로 계산할 수 있습니다.

<div style="padding: 12px 0;"><div style="border-left: 3px solid #d2a8ff; background: #1a0e30; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  현재는 <strong>활성화되어 있지 않습니다</strong>. 단일 X 좌표 보정만으로 대부분 현장에서 충분했고, 3 점 측정은 셋업 시간이 추가됩니다. <em>드로잉 끝부분 흐림이 잦은 현장</em>에서는 켜는 걸 검토 중.
</div></div>

---

## 한계 — 지금 캘리브레이션의 약점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 저항 측정 없음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "접촉했다" 의 판단이 <strong>이동 후 멈춰진 X</strong> 뿐. 실제로 종이를 살짝 누르고 있는지, 너무 깊게 들어갔는지 알 길 없음.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 한 점만 측정</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      가운데 한 점에서 잡은 X 를 전체 영역에 공통 적용. 종이 미세한 기울어짐/표면 굴곡은 무시.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 펜 마모 추적 없음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      한 번 캘리브레이션 후 다음 교체까지 그 값 사용. 같은 펜이라도 잉크 줄어들며 무게중심이 변할 수 있음.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 사람이 체크해야 함</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "이 결과가 좋은가" 를 자동 판정 못함. 결과로 그어 본 선의 진하기를 사람이 보고 OK/재시도.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">&#9888; 펜 위치가 바뀌면 무용</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      운영 중 펜 홀더가 살짝 흔들리면 캘리브레이션 무효. 재캘리브레이션 알림이 없음.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 14px;">&#9888; 평면 보정 비활성</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      코드는 있지만 운영에 안 켜져 있음. 종이 끝 흐림 문제가 누적된 현장에서 효과 검증 필요.
    </div>
  </div>

</div></div>

---

## 개선 방향

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; 비전 기반 검증 — "선이 잘 그어졌나"</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      태블릿 카메라(또는 별도 USB 카메라) 로 캘리브레이션 직후 <strong>테스트 선 그어보기 → 선의 진하기/연속성 자동 측정</strong>. OK 면 저장, 옅으면 +0.3mm 깊이 재시도. 현재 사람 눈 판정을 대체.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; 3 점 평면 보정 활성화</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      이미 작성된 <code>_fit_plane</code> / <code>_calculate_plane_correction</code> 을 옵트인 플래그로 켤 수 있게. <strong>z(x, y) = ax + by + c</strong> 평면 함수가 좌표 변환에 들어가면 종이 기울기 흡수. (#04 의 개선 항목과 직접 연결)
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; 자동 재캘리브레이션 트리거</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      드로잉 N 회 / 시간 M 시간마다, 또는 모니터링이 <em>"흐림 알림"</em> 받으면 자동 재실행. 운영자 개입 없이 선 품질 유지.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 캘리브레이션 히스토리 분석</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      현재 SQLite 에 마지막 값만 저장. <strong>모든 캘리브레이션 결과를 시계열로 기록</strong>해 "이 펜이 50회 후 0.4mm 마모됨" 같은 추세 추출. 펜 교체 시점 추천에 활용.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; force/torque 센서 (미래)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      JAKA 옵션 또는 외부 6축 센서. 접촉 순간의 <strong>실제 압력</strong> 으로 임계 판정. 종이 찢김/펜 부러짐 위험 0 에 수렴.
    </div>
  </div>

  <div style="border: 1px solid #f85149; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700;">6 &middot; 캘리브레이션 dry-run 모드</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "측정만 하고 저장은 안 함" 옵션. 신규 펜 적합성 사전 점검에 유용. <code>?dry_run=true</code> 로 endpoint 확장.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    펜 캘리브레이션은 <strong>"로봇이 도구의 변동을 스스로 흡수한다"</strong> 는 운영 자동화의 가장 기본 단위다. DRP 의 5 단계 알고리즘은 직관적이고 부품 의존성이 0 이지만, 진정한 자동화는 <em>"결과가 좋았는지" 를 로봇이 자체 검증하는 단계까지</em> 가야 비로소 사람의 손을 뗄 수 있다. 비전 기반 검증이 가장 큰 다음 한 걸음.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#05 — AI 라인 드로잉 (Gemini 2.5 Flash Image)](./2026-04-25-05-ai-line-drawing-gemini.md)
- 다음: [#07 — 백그라운드 세션 관리 + Gentle Stop](./2026-04-25-07-background-session-gentle-stop.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
