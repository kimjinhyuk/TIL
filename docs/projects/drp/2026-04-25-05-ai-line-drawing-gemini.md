# #05 — AI 라인 드로잉 (Gemini 2.5 Flash Image)

> **DRP Engineering Notes · Episode 05** &middot; 사진 한 장을 **로봇이 그릴 수 있는 선화 한 장**으로 바꾸는 단계. DRP 는 이걸 Google Gemini 2.5 Flash Image 에게 맡깁니다. 스타일은 4 가지. 이 글은 "왜 외부 모델을 고른 건지, 프롬프트를 어떻게 설계했는지, 그리고 이걸 운영하면서 겪는 문제와 다음 단계" 를 정리합니다.

---

## TL;DR

<div style="padding: 20px 0;"><div style="border: 2px solid #d2a8ff; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1c0f33, #1a0e30); padding: 14px 20px;">
    <span style="color: #d2a8ff; font-weight: 700; font-size: 15px;">라인 드로잉 생성 요약</span>
  </div>
  <div style="background: #0d1117; padding: 16px 20px; color: #e6edf3; font-size: 13.5px; line-height: 2;">
    <div><span style="color:#58a6ff; font-weight: 700;">모델</span> &nbsp;<strong>Gemini 2.5 Flash Image</strong> — 이미지-투-이미지, 프롬프트 기반 변환</div>
    <div><span style="color:#f0883e; font-weight: 700;">스타일</span> &nbsp;minimal / western / asian / modern — 각 스타일별 프롬프트 200~400 줄</div>
    <div><span style="color:#3fb950; font-weight: 700;">공통 규칙</span> &nbsp;<strong>fill 금지 &middot; 어깨까지 &middot; 균일 선 굵기 &middot; 흰 배경</strong> — 로봇 플로터 친화 제약</div>
    <div><span style="color:#f778ba; font-weight: 700;">워크플로우</span> &nbsp;업로드 → <code>raws/</code> → Gemini → <code>outputs/</code> → 후속 파이프라인 (#03)</div>
  </div>
</div></div>

---

## 왜 외부 AI 모델이었나

라인 드로잉을 <strong>규칙 기반(OpenCV edge + thinning)</strong> 으로 시도해 봤지만, 사람 얼굴 특성(피부/머리카락의 부드러운 전환) 을 살려내지 못했습니다. "사진이 그림으로 바뀌었다" 는 감성적 반응을 현장에서 원한 순간, 규칙 기반의 한계가 명확했습니다.

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 13px;">규칙 기반의 한계</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      &times; 피부 엣지가 너무 촘촘하거나 없거나 양극단<br/>
      &times; 머리카락이 "검은 덩어리" 로 뭉침<br/>
      &times; 얼굴 특징의 <strong>의미 추상화</strong> 가 안 됨<br/>
      &times; 사람이 "예쁘다" 고 느끼는 선택이 어려움
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">Gemini 2.5 Flash Image 의 강점</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      &check; 의미 인지 (얼굴/눈/입/머리카락) 후 선택적 단순화<br/>
      &check; 프롬프트로 <strong>스타일 제어</strong> 가능<br/>
      &check; 한국인/아시아 얼굴 특징 잘 잡음<br/>
      &check; 응답 10 초 이내 &rarr; 현장 체감 속도 OK
    </div>
  </div>

</div></div>

<div style="padding: 12px 0;"><div style="border-left: 3px solid #d2a8ff; background: #1a0e30; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#d2a8ff;">선택은 잠정적이다</strong> &mdash; 외부 API 는 비용/정책/가용성 면에서 장기적으로 위험. 이 글 끝에서 <em>로컬 모델로의 전환</em>을 어떻게 준비하는지 다룬다.
</div></div>

---

## 4 가지 스타일

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 13px;">minimal</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      최소한의 선. 옷 테두리/눈썹 1 선씩. "이 사람을 알아볼 수 있는 가장 적은 선" 이 목표. <strong>기본값</strong>.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 13px;">western</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      미국 에디토리얼 캐리커처 느낌. 친근한 과장. MAD Magazine 스타일.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 13px;">asian</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      한국/일본 만화 캐릭터 톤. 큰 눈, 심플한 표정. 이벤트 현장에서 가장 호응 좋음.
    </div>
  </div>

  <div style="border: 1px solid #30363d; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 13px;">modern</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      추상적/모던. 한붓그리기(one-line) 에 가까운 연속 선. 매니아향.
    </div>
  </div>

</div></div>

---

## 프롬프트 설계 — 모두가 지켜야 하는 4 규칙

스타일별 프롬프트는 수백 줄이지만, **모든 스타일의 공통 전제** 는 네 가지입니다:

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #f85149; font-weight: 700; font-size: 14px;">&#128683; NO FILLS</div>
    <div style="color: #8b949e; font-size: 12.5px; margin-top: 6px; line-height: 1.7;">어떤 영역도 검게 채우지 않음. 로봇 펜이 "색을 칠하지 못함". 머리카락/눈/입 전부 윤곽만.</div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #f0883e; font-weight: 700; font-size: 14px;">&#128100; 어깨까지</div>
    <div style="color: #8b949e; font-size: 12.5px; margin-top: 6px; line-height: 1.7;">팔/손/몸통 금지. A4 에 담을 수 있는 구도로 고정. 경로 수 제어에도 기여.</div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9999; 균일 선 굵기</div>
    <div style="color: #8b949e; font-size: 12.5px; margin-top: 6px; line-height: 1.7;">1.5~2 px 한 톤. 볼펜/플로터가 표현 못하는 굵기 변조 제거.</div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9711; 흰 배경</div>
    <div style="color: #8b949e; font-size: 12.5px; margin-top: 6px; line-height: 1.7;">배경 요소 금지. 이진화/벡터화가 깨끗하게 동작하도록 입력 보장.</div>
  </div>

</div></div>

### 프롬프트 구조 — `minimal` 예시의 골격

```text
🤖 ROBOT BALLPOINT PEN PLOTTER - MINIMAL LINE DRAWING

━━━ ABSOLUTE CRITICAL RULES ━━━
🚫 ABSOLUTELY FORBIDDEN - NO FILLS ANYWHERE
❌ NO black fills, shading, hatching, or coloring ANYWHERE
❌ NO filled hair / eyebrows / eyes / nostrils / lips / clothing
Think: "OUTLINE ONLY - Everything empty like a coloring book"

📏 COMPOSITION - SHOULDERS ONLY
✓ Draw ONLY: Head + Face + Neck + Shoulders
❌ DO NOT draw: Arms, hands, torso, or anything below shoulders

🎯 MINIMAL LINES - ROBOT EFFICIENCY
- Use the FEWEST possible lines
- Each line takes robot time - minimize line count

━━━ WHAT TO DRAW ━━━
1. FACE OUTLINE: Simple, clean face shape outline
2. EYES: Realistic proportions from photo
3. EYEBROWS: ONE simple curved line per eyebrow
4. NOSE: 1-2 minimal lines for nose shape
5. MOUTH: ONE simple line for mouth outline
6. HAIR: Outer boundary + 2-4 interior flow lines
7. NECK/SHOULDERS: Simple clean outlines
8. CLOTHING: ONE collar line, NO patterns

━━━ ABSOLUTE PROHIBITIONS ━━━
❌ NO black fills anywhere
❌ NO shading / hatching / gradients
❌ NO thin/light lines (robot will remove them)

━━━ FINAL OUTPUT ━━━
- Pure white background
- Black outline lines only (~1.5-2px)
- Shoulders height maximum

PRESERVE person's gender (male→male, female→female).
```

<div style="padding: 12px 0;"><div style="border-left: 3px solid #f0883e; background: #1c1206; padding: 12px 16px; border-radius: 0 8px 8px 0; color: #e6edf3; font-size: 13px; line-height: 1.7;">
  <strong style="color:#f0883e;">장황해 보이는 건 의도</strong> &mdash; Gemini 는 <em>"그러지 말라"</em> 를 여러 각도에서 말할수록 잘 따른다. 단일 "no fill" 한 번보다 "NO black fills / NO filled hair / NO filled eyebrows / NO filled eyes …" 를 나열해야 실제로 빈 윤곽이 나온다. 프롬프트 길이 &rarr; 품질 직접 상관. 이건 경험적으로만 검증됨.
</div></div>

---

## 서비스 흐름 — 한 요청의 일생

<div style="padding: 20px 0;"><div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">

  <div style="border: 2px solid #58a6ff; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #1f3a5f, #1a2744); text-align: center;">
    <span style="color: #58a6ff; font-weight: 700;">&#128242; POST /api/v1/image/line-drawing &middot; form-data: file + style</span>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700;">&#9312; 파일명 생성</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      S3 에서 오늘 날짜의 최대 시퀀스를 조회 &rarr; <code>YYYYMMDD-NNN.ext</code> 형식. 현장 여러 곳이 같이 써도 충돌 없게 <strong>robot_id</strong> 접두사 포함.
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700;">&#9313; Gemini 호출</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      이미지 bytes + 스타일 프롬프트 &rarr; PIL 로 PNG 변환(투명도 처리) &rarr; Gemini 2.5 Flash Image API &rarr; 결과 bytes.<br/>응답 평균 <strong>6~12 초</strong>. 실패 시 원본 재시도 (최대 2 회).
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700;">&#9314; S3 업로드 두 벌</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      <code>raws/&lt;filename&gt;</code> 에 원본, <code>outputs/&lt;filename&gt;_result.png</code> 에 결과. 둘 다 업로드 후 URL 반환.<br/>MinIO/S3 fallback 지원 (네트워크 일시 장애 대비).
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="width: 100%; max-width: 680px; border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700;">&#9315; 응답</span>
    </div>
    <div style="background: #0d1117; padding: 10px 14px; color: #8b949e; font-size: 12.5px; line-height: 1.8;">
      JSON: <code>status</code> / <code>inputImageFile</code> / <code>outputUrl</code> / <code>style</code> / <code>duration</code>.<br/>프론트는 <code>outputUrl</code> 을 미리보기로 띄우고 "그리기" 버튼 노출.
    </div>
  </div>
  <div style="color: #484f58; font-size: 20px;">&#x25BC;</div>

  <div style="border: 2px solid #f778ba; border-radius: 10px; padding: 12px 28px; background: linear-gradient(135deg, #2a0f1f, #1a0a14); text-align: center;">
    <span style="color: #f778ba; font-weight: 700;">&#129302; 사용자 확인 후 POST /process-image &rarr; 드로잉 (#03)</span>
  </div>

</div></div>

### 핵심 코드 구조

```python
# line_drawing_service.py — 오케스트레이션
async def process_image(self, file: UploadFile, style: str = "minimal") -> dict:
    t0 = time()

    # 1. S3 기반 파일명 생성 (동시성 안전)
    ext = self._get_file_extension(file)
    input_filename, _ = get_next_filename_from_s3(
        s3_client=storage_service.s3_client,
        bucket=settings.s3_bucket, prefix="raws/",
        extension=ext, robot_id=settings.robot_id,
    )

    # 2. 이미지 읽기
    file_data = await file.read()

    # 3. Gemini 변환
    result_image_data = await gemini_image_service.convert_to_line_drawing(
        image_data=file_data, style=style,
    )

    # 4. 원본 업로드 (raws/)
    input_url = await storage_service.upload_file(
        file_data=file_data, key=f"raws/{input_filename}",
        content_type=file.content_type,
        metadata={"source": "line_drawing_input", "style": style},
    )

    # 5. 결과 업로드 (outputs/)
    output_filename = get_output_filename(input_filename)
    output_url = await storage_service.upload_file(
        file_data=result_image_data,
        key=f"outputs/{output_filename}",
        content_type="image/png",
    )

    return {
        "status": "completed",
        "inputImageFile": input_filename,
        "outputUrl": output_url,
        "style": style,
        "duration": format_duration(time() - t0),
    }
```

---

## 관찰 지표

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #3fb950; font-weight: 700; font-size: 18px;">6~12s</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">Gemini 변환 지연 <br/>(1024&times;1024 입력 기준)</div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #f0883e; font-weight: 700; font-size: 18px;">~ 1MB</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">결과 PNG 평균 크기</div>
  </div>

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #f85149; font-weight: 700; font-size: 18px;">2~5%</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">실패율 (타임아웃/정책 거부)</div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; padding: 14px; background: #0d1117;">
    <div style="color: #d2a8ff; font-weight: 700; font-size: 18px;">20MB</div>
    <div style="color: #8b949e; font-size: 12px; margin-top: 4px;">입력 최대 파일 크기</div>
  </div>

</div></div>

---

## 한계 — 지금 AI 드로잉의 약점

<div style="padding: 16px 0;"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">

  <div style="border: 1px solid #5a1c1c; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px;">
      <span style="color: #f85149; font-weight: 700; font-size: 14px;">&#9888; 외부 API 의존</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      비용이 사용량에 비례. 정책 변경 시 <strong>하루 아침에 출력이 달라짐</strong>. 현장 이벤트 중단 가능성.
    </div>
  </div>

  <div style="border: 1px solid #5a3600; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px;">
      <span style="color: #f0883e; font-weight: 700; font-size: 14px;">&#9888; 프롬프트가 긴 상수</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      스타일 4 개 &times; 수백 줄. 공통 규칙(fill 금지, 어깨까지) 이 <strong>4 번 반복</strong>되어 있어 수정이 3 번 누락 위험.
    </div>
  </div>

  <div style="border: 1px solid #3d2266; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px;">
      <span style="color: #d2a8ff; font-weight: 700; font-size: 14px;">&#9888; 결과 일관성 없음</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      같은 사진이라도 호출마다 결과 다름. <strong>seed 제어 불가</strong>. 현장에서 "한 번 더 찍어 드릴게요" 요청 빈도 높음.
    </div>
  </div>

  <div style="border: 1px solid #1a5c2e; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px;">
      <span style="color: #3fb950; font-weight: 700; font-size: 14px;">&#9888; 품질 관찰 부재</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      "이번 주 라인 드로잉 평균 품질" 을 알 방법 없음. 사용자 만족도 피드백 루프가 앱에 없음. 프롬프트 변경 효과 측정 불가.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px;">
      <span style="color: #58a6ff; font-weight: 700; font-size: 14px;">&#9888; 프롬프트 버전 관리 약함</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      소스 코드 안에 상수로 존재. 누가 언제 왜 바꿨는지 git log 로만 추적. 롤백이 배포 급.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px;">
      <span style="color: #f778ba; font-weight: 700; font-size: 14px;">&#9888; 데이터 주권 이슈</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      이벤트 참여자 얼굴 사진이 외부 API 로 송신됨. 개인정보/프라이버시 관점에서 <strong>고지 및 동의</strong> 절차가 필요하고, 장기적으로 <em>경계 안</em> 처리가 바람직.
    </div>
  </div>

</div></div>

---

## 개선 방향 — "Gemini 만" 에서 탈출하기

<div style="padding: 16px 0;"><div style="display: flex; flex-direction: column; gap: 12px;">

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">1 &middot; 프롬프트 템플릿 시스템</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      공통 규칙(<code>COMMON_RULES</code>) + 스타일별 변주(<code>STYLE_BLOCKS</code>) + 최종 지시(<code>OUTPUT_SPEC</code>) 로 분해. 스타일 추가/수정이 파일 한 두 곳 편집. <strong>YAML 로 외부화</strong>해 버전 관리/리뷰 용이.
    </div>
  </div>

  <div style="border: 1px solid #f0883e; border-radius: 10px; overflow: hidden;">
    <div style="background: #1c1206; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f0883e; font-weight: 700;">2 &middot; 콘텐츠 해시 캐싱</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>sha256(image_bytes + style + prompt_version)</code> 을 키로 결과 PNG 를 S3 에 저장. 같은 사진을 재처리할 때 <strong>API 비용 + 지연 0</strong>. 데모/개발 환경 특히 효과.
    </div>
  </div>

  <div style="border: 1px solid #3fb950; border-radius: 10px; overflow: hidden;">
    <div style="background: #04260f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #3fb950; font-weight: 700;">3 &middot; 사용자 피드백 루프</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      미리보기 화면에 <strong>&#128077;/&#128078; + 자유 코멘트</strong>. SQLite 히스토리에 결과 등급 저장. 스타일별/프롬프트 버전별 만족도 추세를 봄. 프롬프트 수정이 운영 임팩트를 가지는 변경으로 승격.
    </div>
  </div>

  <div style="border: 1px solid #d2a8ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #1a0e30; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #d2a8ff; font-weight: 700;">4 &middot; 로컬 SD + ControlNet (LineArt) 파일럿</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      ComfyUI 워크플로우로 <strong>Stable Diffusion + LineArt ControlNet</strong>. 같은 네트워크(#02 의 그룹웨어 온프레미스 GPU) 위에서 돌림. 비용 0 + 데이터 주권 확보. 초기 품질은 Gemini 대비 열세 예상 &rarr; 프롬프트/워크플로우 튜닝 프로젝트로 진행.
    </div>
  </div>

  <div style="border: 1px solid #f778ba; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f1f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f778ba; font-weight: 700;">5 &middot; Provider 추상화 (Gemini ↔ Local)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      <code>LineArtProvider</code> 인터페이스(<code>convert(image, style) -&gt; bytes</code>). Gemini/Local/Mock 구현체. 현장별/스타일별로 <strong>라우팅</strong> 가능. SDK 추상화는 #02 의 RobotClient 설계와 같은 방향.
    </div>
  </div>

  <div style="border: 1px solid #f85149; border-radius: 10px; overflow: hidden;">
    <div style="background: #2a0f0f; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #f85149; font-weight: 700;">6 &middot; 품질 수치화 (자동)</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      결과 PNG 에 대해 <strong>line-pixel 비율 / 연결된 경로 수 / 얼굴 특징 유지도</strong>(간단한 얼굴 detection) 를 자동 계산. 품질 등급을 응답에 포함. 프롬프트 회귀 감지용.
    </div>
  </div>

  <div style="border: 1px solid #58a6ff; border-radius: 10px; overflow: hidden;">
    <div style="background: #0c2d6b; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #58a6ff; font-weight: 700;">7 &middot; 프라이버시 기본값 강화</span>
      <span style="color: #8b949e; font-size: 11px;">우선순위 &#9733;&#9733;&#9733;</span>
    </div>
    <div style="background: #0d1117; padding: 12px 14px; color: #8b949e; font-size: 13px; line-height: 1.7;">
      원본/결과 보존 기간을 <strong>이벤트 당일 자정까지</strong> 로 축소 기본값. 장기 보존은 명시적 옵트인. 앱 동의 화면에 "외부 AI 로 전송" 고지.
    </div>
  </div>

</div></div>

---

## 요약

<div style="padding: 16px 0;"><div style="border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; background: #0d1117;">
  <div style="color: #e6edf3; font-size: 13.5px; line-height: 2;">
    Gemini 를 쓰는 결정은 <strong>운영 속도</strong>와 <strong>일관된 예술성</strong>을 빠르게 확보하기 위한 타협이었다. 사용자 체감은 확실히 좋다 &mdash; 그게 없었으면 이 프로젝트가 살아남지 못했을 수도. 다만 장기적으로 <strong>외부 API + 긴 문자열 상수</strong>는 기술 부채다. 다음 단계는 "<em>프롬프트를 관리 가능한 자산으로</em>" 만들고, "<em>로컬 모델로의 안전한 이동 경로</em>" 를 준비하는 일이다.
  </div>
</div></div>

---

## 이전 글 / 다음 글

- 이전: [#04 — A4 안전 좌표계 — 픽셀, mm, 그리고 클램핑](./2026-04-25-04-a4-safe-coordinate-system.md)
- 다음: **#06 — 펜 자동 캘리브레이션** (예정) — 매번 다른 펜 길이를 자동 보정하는 알고리즘

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />
