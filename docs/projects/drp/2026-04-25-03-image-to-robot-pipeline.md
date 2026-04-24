# #03 — 이미지 → 벡터 → 로봇 명령 풀 파이프라인

> **DRP Engineering Notes · Episode 03** &middot; AI 가 만들어 준 라인드로잉 PNG 한 장이 어떻게 **수백 개의 `moveL` 명령**이 되어 로봇팔로 흘러 들어가는지. 이 글은 그 여정을 4 단계(다운로드 → 벡터화 → 경로 최적화 → 좌표 변환) 로 펼치고, 각 단계가 지금 어디서 약한지 기록합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #f0883e; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2d1a04, #1c1206); padding: 14px 20px;">
    <span style="color: #f0883e; font-weight: 700; font-size: 15px;">파이프라인 4 단계</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">1. 다운로드 / 전처리</span> &nbsp;URL &rarr; bytes &rarr; Otsu/Adaptive 이진화</div>
    <div><span style="color:#f0883e; font-weight: 700;">2. 벡터화</span> &nbsp;이진 이미지 &rarr; <strong>4 단계 fallback</strong> &rarr; <code>List[List[(x, y)]]</code></div>
    <div><span style="color:#3fb950; font-weight: 700;">3. 경로 최적화</span> &nbsp;Douglas-Peucker 단순화 &rarr; 리샘플링 &rarr; <strong>NN + 2-opt</strong> 순서 정렬</div>
    <div><span style="color:#d2a8ff; font-weight: 700;">4. 좌표 변환</span> &nbsp;픽셀 &rarr; mm &rarr; A4 안전 영역 매핑 &rarr; <strong>RobotCommand</strong> 리스트 (#04 에서 상세)</div>
  </div>
</div></div>

---

## 전체 지도 — 한 장으로

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="border: 2px solid #58a6ff; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #1f3a5f, #1a2744); text-align: center;">
    <span style="color: #58a6ff; font-weight: 700;">&#128206; 입력 &mdash; Gemini 가 만든 라인드로잉 PNG URL</span>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; text-align: center;">
      <span style="color: #58a6ff; font-weight: 700;">STAGE 1 &middot; 다운로드 + 전처리</span>
    </div>
    <div style="padding: 12px; background: #0d1117;">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 8px; text-align: center; color: #e6edf3; font-size: 12px;">aiohttp 다운로드</div>
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 8px; text-align: center; color: #e6edf3; font-size: 12px;">PIL 로드 + RGB</div>
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 8px; text-align: center; color: #e6edf3; font-size: 12px;">Otsu / Adaptive 이진화</div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #2d1a04; padding: 10px 14px; text-align: center;">
      <span style="color: #f0883e; font-weight: 700;">STAGE 2 &middot; 벡터화 (4 단계 fallback)</span>
    </div>
    <div style="padding: 12px; background: #0d1117;">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 11.5px;">&#9312; Edge<br/><span style="color:#8b949e; font-size:10.5px;">Canny 30-100</span></div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 11.5px;">&#9313; Skeleton<br/><span style="color:#8b949e; font-size:10.5px;">Zhang-Suen</span></div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 11.5px;">&#9314; Contour<br/><span style="color:#8b949e; font-size:10.5px;">findContours</span></div>
        <div style="background: #1c1206; border: 1px solid #5a3600; border-radius: 6px; padding: 8px; text-align: center; color: #f0883e; font-size: 11.5px;">&#9315; Hough<br/><span style="color:#8b949e; font-size:10.5px;">HoughLinesP</span></div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; text-align: center;">
      <span style="color: #3fb950; font-weight: 700;">STAGE 3 &middot; 경로 최적화</span>
    </div>
    <div style="padding: 12px; background: #0d1117;">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 11.5px;">길이 필터<br/><span style="color:#8b949e; font-size:10.5px;">min &#8805; 0.5px</span></div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 11.5px;">Douglas-Peucker<br/><span style="color:#8b949e; font-size:10.5px;">tol = 1.0</span></div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 11.5px;">리샘플 + stride<br/><span style="color:#8b949e; font-size:10.5px;">spacing 1.0</span></div>
        <div style="background: #04260f; border: 1px solid #1a5c2e; border-radius: 6px; padding: 8px; text-align: center; color: #3fb950; font-size: 11.5px;">NN + 2-opt<br/><span style="color:#8b949e; font-size:10.5px;">이동 거리 최소</span></div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c0f33; padding: 10px 14px; text-align: center;">
      <span style="color: #d2a8ff; font-weight: 700;">STAGE 4 &middot; 좌표 변환 (#04 에서 상세)</span>
    </div>
    <div style="padding: 12px; background: #0d1117;">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">픽셀 &rarr; mm</div>
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">A4 안전영역 클램핑</div>
        <div style="background: #1a0e30; border: 1px solid #3d2266; border-radius: 6px; padding: 8px; text-align: center; color: #d2a8ff; font-size: 12px;">penUp/Down + moveL</div>
      </div>
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="border: 2px solid #f778ba; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #2a0f1f, #1a0a14); text-align: center;">
    <span style="color: #f778ba; font-weight: 700;">&#129302; RobotCommand[N] &mdash; SyncRobotClient 로 전송</span>
  </div>

</div></div>

---

## Stage 1 — 다운로드 + 전처리

```python
# image_processor.py — 파이프라인 오케스트레이션 (요약)
async def process_image_to_robot_commands(
    self, image_url: str, input_filename: Optional[str] = None,
    debug: bool = False, drawing_mode: str = "one_line",
) -> tuple[List[RobotCommand], Optional[DebugInfo], List[str]]:
    # 1. 다운로드
    image_bytes = await self._download_image(image_url)
    image = self._load_image(image_bytes)          # PIL → np.ndarray (BGR)

    # 2. 전처리 — Otsu vs Adaptive 중 선 픽셀 많은 쪽 선택
    binary = self._preprocess_image(image)

    # 3. 벡터화 — 4 단계 fallback
    paths = self.vectorizer.vectorize_image(binary)

    # 4. 경로 최적화
    optimized = self.path_optimizer.optimize_paths(paths)

    # 5. 좌표 변환 → RobotCommand 리스트
    commands = self.coordinate_converter.paths_to_robot_commands(optimized)
    return commands, debug_info, warnings
```

<div style="padding: 12px 0;"><div style="border-left: 3px solid #58a6ff; background: #0c2d6b; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#58a6ff;">이진화 전략</strong> &mdash; 입력이 <em>"깨끗한 라인드로잉"</em> 이라는 가정(Gemini 가 만든 결과) 이 있어서 Otsu 한 방으로 대부분 처리된다. 다만 배경 그라데이션이 있는 경우를 위해 Adaptive 결과도 계산한 뒤, <strong>선 픽셀 수가 더 많은 쪽</strong>을 고른다. 임계값 튜닝 없이 입력 다양성에 어느 정도 대응.
</div></div>

---

## Stage 2 — 벡터화의 4 단계 Fallback

`Vectorizer.vectorize_image(...)` 은 한 번에 한 방법을 시도하고, 경로가 충분히 나오지 않으면 다음 방법으로 넘어갑니다. 라인드로잉의 특성(얇고, 거의 닫힌 곡선) 때문에 **한 기법만으로는 모든 입력을 못 잡습니다**.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700;">&#9312; Edge Detection (Canny)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <strong>주 용도</strong> — 깔끔한 선화 (Gemini 출력) 의 1 순위.<br/>
      <strong>임계값</strong> — 30-100 (얇은 선까지 수용).<br/>
      <strong>약점</strong> — 굵은 흑백 덩어리에서 선이 두 줄로 겹침.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700;">&#9313; Skeletonization</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <strong>주 용도</strong> — 굵은 선/붓터치 느낌의 입력. <strong>Zhang-Suen thinning</strong> 으로 1-픽셀 두께 뼈대 추출.<br/>
      <strong>약점</strong> — 느리다. 노이즈에 취약.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700;">&#9314; Contour (findContours)</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <strong>주 용도</strong> — 폐곡선이 많은 경우(얼굴 윤곽, 눈). 빠르고 안정적.<br/>
      <strong>약점</strong> — 자기 자신을 두 번 그림 (바깥 + 내부). hybrid 선택 로직으로 한 쪽만 남김.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700;">&#9315; Hough Lines</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <strong>주 용도</strong> — 기하학 도형/건축 이미지 폴백.<br/>
      <strong>약점</strong> — 얼굴/유기적 곡선에선 거의 안 맞음. 마지막 수단.
    </div>
  </div>

</div></div>

추가 옵션으로 **Potrace** (외부 바이너리) 도 꽂을 수 있지만, 현재 운영 기본값은 `prefer_potrace=False`. 하이브리드 파이프라인이 더 예측 가능했습니다.

---

## Stage 3 — 경로 최적화

`PathOptimizer.optimize_paths(...)` 가 실제로 하는 일을 순서대로:

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 10px;">

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #0c2d6b; border: 1px solid #58a6ff; display: flex; align-items: center; justify-content: center; color: #58a6ff; font-weight: 700; font-family: monospace;">1</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">길이 필터 (점선 방지)</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">길이 &lt; 0.5px 경로 제거. 너무 짧으면 점처럼 찍혀 드로잉이 "점선" 같아 보임.</div>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #1c1206; border: 1px solid #f0883e; display: flex; align-items: center; justify-content: center; color: #f0883e; font-weight: 700; font-family: monospace;">2</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">Douglas-Peucker 단순화</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">허용오차 <code>tolerance=1.0</code>. 중간 점들이 직선으로 대체 가능하면 제거. <strong>로봇 명령 수가 가장 크게 줄어드는 단계</strong>.</div>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #04260f; border: 1px solid #3fb950; display: flex; align-items: center; justify-content: center; color: #3fb950; font-weight: 700; font-family: monospace;">3</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">리샘플링 + stride</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">점 간격을 1px 로 균등화한 뒤 <code>point_stride</code> 로 솎아냄. 선 밀도가 로봇에 부담이지 않도록.</div>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #1a0e30; border: 1px solid #d2a8ff; display: flex; align-items: center; justify-content: center; color: #d2a8ff; font-weight: 700; font-family: monospace;">4</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">이웃 경로 병합 (옵션)</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">끝점 거리 &lt; ε 이면 붙여서 pen-up/down 횟수 축소. 눈썹처럼 떨어져야 할 선들 보호 위해 현재 <code>max_join_distance=0</code> 으로 비활성.</div>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; gap: 12px;">
    <div style="min-width: 44px; border-radius: 8px; background: #2a0f1f; border: 1px solid #f778ba; display: flex; align-items: center; justify-content: center; color: #f778ba; font-weight: 700; font-family: monospace;">5</div>
    <div style="flex: 1; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; background: #0d1117;">
      <div style="color: #e6edf3; font-weight: 600; font-size: 13px;">경로 순서 정렬 (NN + 2-opt)</div>
      <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">다음 경로로 이동할 거리를 최소화하도록 <strong>Nearest Neighbor</strong> 로 초안을 짜고 <strong>2-opt</strong> 로 국소 개선. 잉크가 없는 이동 시간 = 로봇이 "쉬는 시간" 이라 체감 속도가 크게 바뀜.</div>
    </div>
  </div>

</div></div>

### Douglas-Peucker — 한 줄 의사코드

```python
def _douglas_peucker(points, tolerance):
    # 첫-끝 직선에서 가장 멀리 떨어진 점 찾기
    start, end = points[0], points[-1]
    dmax, idx = max((perp_distance(p, start, end), i)
                    for i, p in enumerate(points[1:-1], start=1))
    # 허용오차 이상이면 재귀 분할, 아니면 직선으로 축약
    if dmax > tolerance:
        left  = _douglas_peucker(points[:idx+1], tolerance)
        right = _douglas_peucker(points[idx:],   tolerance)
        return np.concatenate([left[:-1], right])
    return np.array([start, end])
```

`tolerance` 만 올바르게 주면 원래 경로 "느낌" 을 유지하면서 점 수를 10~20배 줄일 수 있습니다. 현재 1.0 은 "픽셀 단위로 덜렁거리지 않되 얼굴 윤곽의 결은 살리는" 정도.

### NN + 2-opt — "쉬는 시간" 줄이기

```python
def _sort_paths_for_minimum_travel(self, paths):
    order = self._nearest_neighbor_tsp(paths)     # greedy 초안
    order = self._two_opt_optimize(paths, order)  # 국소 스왑 개선
    return [paths[i] for i in order]
```

경로 수가 수백 개가 되면 완전 TSP 는 느립니다. NN 으로 수초 안에 80% 품질의 순서를 뽑은 뒤 2-opt 로 다듬는 "실용 TSP" 가 프린터/플로터계의 오래된 패턴.

---

## Stage 4 — 좌표 변환 (미리보기)

Stage 4 는 **#04 전용**이지만, 여기서 출력을 미리 보면 이해가 빠릅니다. 경로 한 개당 이렇게 변환됩니다:

```text
path = [(px_x0, px_y0), (px_x1, px_y1), ..., (px_xN, px_yN)]

  ↓  Stage 4 (coordinate converter)

RobotCommand:
  penUp            → 펜 들고 경로 시작점으로 이동
  moveL(x0, y0)    → 시작점 (Z_TRAVEL 높이)
  penDown          → 펜 내리기
  moveL(x0, y0)    → 시작점 (Z_DRAWING 높이)
  moveL(x1, y1)    → 그리기 시작
  moveL(x2, y2)    → ...
  moveL(xN, yN)    → 마지막 점
  penUp            → 경로 종료
```

즉 **경로 N 개 + 점 M 개** 는 `2N + M` 개 정도의 로봇 명령이 됩니다. 경로 최적화가 줄여야 하는 것이 이 숫자.

---

## 지표 — 로그에서 보는 파이프라인 건강도

운영 중 이 파이프라인이 "좋게" 돌고 있는지 판정할 때 보는 숫자들:

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">

  <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #58a6ff; font-weight: 700; font-size: 13px;">입력 선 픽셀 비율</div>
    <div style="color: #e6edf3; font-weight: 700; font-size: 18px; margin-top: 4px;">2~8%</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">너무 작으면 빈 이미지, 너무 크면 fill 이 섞인 것</div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #f0883e; font-weight: 700; font-size: 13px;">벡터화 경로 수</div>
    <div style="color: #e6edf3; font-weight: 700; font-size: 18px; margin-top: 4px;">20 ~ 200</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">사람 얼굴 기준. 1000+ 이면 단순화 실패 의심</div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #3fb950; font-weight: 700; font-size: 13px;">DP 이후 점 감소율</div>
    <div style="color: #e6edf3; font-weight: 700; font-size: 18px; margin-top: 4px;">80~95%</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">덜 줄어들면 tol 너무 작거나 입력 노이즈 큼</div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #d2a8ff; font-weight: 700; font-size: 13px;">총 로봇 명령 수</div>
    <div style="color: #e6edf3; font-weight: 700; font-size: 18px; margin-top: 4px;">500 ~ 2000</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 3px;">현재 50ms 간격에서 드로잉 2~4분 범위</div>
  </div>

</div></div>

---

## 한계 — 지금 파이프라인이 막히는 곳

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 곡선이 직선들로 근사됨</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>moveL</code> 만 쓰므로 얼굴 윤곽의 부드러운 호가 <strong>작은 직선 조각의 연쇄</strong>로 그려진다. 가까이서 보면 각이 드러남. BezierCurveApproximator 를 내장해 뒀지만 로봇 측이 <code>moveC</code> 지원을 안 쓰고 있어 효과가 제한적.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 경로 분기/종료점 정보 손실</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      벡터화 결과가 "<strong>경로의 리스트</strong>" 라 원본 선 아트의 연결 관계(어떤 선이 어디서 이어지는지)가 사라짐. NN 정렬이 최선이지만 사람이 보기엔 순서가 불자연스러운 케이스가 가끔.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 파라미터 튜닝이 전역</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>tolerance</code> · <code>stride</code> · <code>min_path_length</code> 가 전역 상수. 얼굴은 섬세, 배경 건물은 거칠게 처리하고 싶지만 현재는 한 벌로 간다.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; dry-run 이 없음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      실제 로봇에 보내기 전에 <strong>SVG/PNG 로 결과를 미리 그려보는 기능</strong>이 없음. 문제 생기면 로봇에서 확인 &rarr; 시간 소모. QA 가 느려짐.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">&#9888; 품질 자동 평가 불가</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "이번 이미지는 잘 뽑혔다" 를 사람 눈으로 판정 중. 원본-드로잉-재벡터화 3 자 간 유사도를 수치화할 인프라 없음.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 14px;">&#9888; 펜 up/down 비용</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      경로 하나마다 pen-up &rarr; travel &rarr; pen-down. 작은 터치들이 많아지면 실제 드로잉 시간의 30%가 "잉크 없는 이동". 병합을 보수적으로 두고 있어서.
    </div>
  </div>

</div></div>

---

## 개선 방향 — 다음 1 년 로드맵

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; Dry-run 시뮬레이터 (SVG/PNG 미리보기)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      RobotCommand 리스트를 받아 SVG 로 렌더. 펜 up/down 은 점선, moveL 은 실선. <strong>API 응답에 base64 PNG 동봉</strong>해 프론트에서 즉시 확인. 로봇 없이도 QA 가능.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; 품질 평가 프레임</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      데이터셋(샘플 50장) 기준으로 <strong>원본 vs dry-run 미리보기</strong> 유사도(SSIM/LPIPS) 자동 계산. 파이프라인 파라미터 변경 PR 에서 "개선/퇴행"이 숫자로 보이게.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; moveC 지원으로 실제 곡선 그리기</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      JAKA 가 지원하는 <code>moveC</code> (원호) 를 RobotCommand 에 추가. Bezier 근사 결과에서 각 segment 를 원호 명령으로 매핑 &rarr; 표면 부드러워짐 + 명령 수 추가 감소.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 영역별 파라미터 (semantic-aware)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      얼굴 영역은 <code>tol=0.6</code>, 배경은 <code>tol=1.5</code>. <strong>얼굴 bounding box 검출</strong> 후 영역별 다른 최적화 파라미터 적용.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; ML 기반 stroke 순서</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      사람이 보기 "자연스러운 그림 순서"(윤곽 &rarr; 눈 &rarr; 입 &rarr; 머리) 를 학습한 순서 모델 도입. 현재 NN 은 기하 거리만 봄.
    </div>
  </div>

  <div style="border: 1px solid #f85149; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700;">6 &middot; 파이프라인 debug 엔드포인트</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>?debug=true</code> 로 호출하면 <strong>각 단계 중간 산출물</strong>(전처리 이진화, 벡터화 결과 JSON, 단순화 전후, 정렬 전후) 을 파일로 저장. 이슈 리포트에 붙이기 쉬움.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    이 파이프라인의 진짜 어려움은 <em>한 기법</em>을 잘 짜는 게 아니라, <strong>입력의 다양성을 한 벌의 코드가 받아내는 것</strong>이다. 4단계 fallback 은 그 답의 하나고, 지금은 제법 잘 돌고 있다. 대신 개선은 &mdash; <strong>"지금보다 얼마나 나아졌는지"를 숫자로 증명하는 인프라</strong>가 먼저 필요하다. dry-run 시뮬레이터와 품질 평가 프레임이 최우선 이유다.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#02 — JAKA 컨트롤러 raw TCP/JSON 프로토콜](./2026-04-25-02-jaka-raw-tcp-protocol.md)
- 다음: [#04 — A4 안전 좌표계 — 픽셀, mm, 그리고 클램핑](./2026-04-25-04-a4-safe-coordinate-system.md)

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
