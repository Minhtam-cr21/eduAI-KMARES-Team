# Upgrade Track 1 Report

**Track:** Assessment Rubric Professionalization  
**Date:** 2026-04-16  
**Scope:** additive rubric/contracts/view builder layer for assessment result only.

## Mục tiêu track

- Chuẩn hóa assessment hiện có thành hệ thống đánh giá chuyên nghiệp 3 tầng.
- Giữ compatibility với pipeline Phase 3 hiện tại.
- Chỉ đụng domain assessment trong phạm vi prompt.

## File đã sửa

### Thêm

- `lib/assessment/rubric.ts`
- `ASSESSMENT_RUBRIC_STANDARD.md`
- `UPGRADE_TRACK_1_REPORT.md`

### Sửa

- `lib/assessment/load-result.ts`
- `app/(student)/assessment/result/page.tsx`

## Rubric mới gồm những gì

### Contracts additive

- `AssessmentBand`
- `AssessmentRubric`
- `StudentAssessmentView`
- `TeacherAssessmentView`

### 4 trụ chuẩn hóa

- `motivation`
- `learning_style`
- `foundation_skills`
- `interest_alignment`

Mỗi trụ có:
- `score`
- `band`
- `short_interpretation`
- `path_implication`
- `schedule_implication`

### Presentation layer mới

- `StudentAssessmentView`
  - headline
  - summary
  - pacing recommendation
  - strengths
  - support needs
  - next steps
- `TeacherAssessmentView`
  - readiness band
  - pacing guidance
  - primary risks
  - support strategies
  - intervention cues

## Compatibility giữ như thế nào

- Không sửa `lib/assessment/questions.ts`
- Không đổi raw scoring trong `computeTraits(...)`
- Không thêm model call mới
- Không đổi schema DB lớn
- Không thay shape cũ của result payload; chỉ **additive** thêm:
  - `rubric`
  - `student_view`
  - `teacher_view`
- `traits`, `learner_profile`, `ai_analysis`, `analysis_source`, `assessment_version` vẫn giữ nguyên
- UI result vẫn giữ các block structured/legacy quan trọng, chỉ được professionalize thêm bằng rubric layer

## Những gì đã hoàn thành

- Tạo rubric chuẩn hóa 4 trụ trên baseline deterministic hiện có.
- Tạo builder riêng cho:
  - student-facing interpretation
  - teacher-facing interpretation
- Nối các field mới vào `AssessmentResultPayload` theo hướng additive.
- Refactor `app/(student)/assessment/result/page.tsx` để:
  - hiển thị band rõ ràng
  - hiển thị interpretation rõ hơn
  - hiển thị pacing recommendation
  - tách rõ điểm mạnh và nhu cầu hỗ trợ
- Tạo doc chuẩn:
  - `ASSESSMENT_RUBRIC_STANDARD.md`

## Build/check result

- `ReadLints` trên các file vừa sửa: **không có lỗi**
- `npm run build`: **PASS**

## Rủi ro còn lại

- Threshold band hiện tại (`<45`, `45..74`, `>=75`) là rule additive mới, chưa phải rubric đã được research/mentor validation sâu.
- `TeacherAssessmentView` mới chỉ là contract + builder dùng chung; track này chưa mở teacher UI mới cho rubric.
- Result page hiện vẫn fetch client-side như flow cũ; track này ưu tiên professionalization của content/contract hơn là tối ưu loading.
- Rubric hiện suy diễn từ `trait_scores` hiện có, nên chất lượng vẫn phụ thuộc baseline scoring cũ.
- Một số câu chữ interpretation hiện là rule-based copy layer; có thể cần mentor/product tuning thêm để đồng nhất tone chính thức.

## CẦN XÁC NHẬN

- Team có chấp nhận `Low / Medium / High` với threshold hiện tại làm chuẩn rubric phase này không?
- `TeacherAssessmentView` có nên được xem là contract nền cho future teacher-facing assessment surfaces không?
- Có muốn phase sau tiếp tục professionalize assessment result theo hướng server-first load/perceived performance, hay giữ focus hoàn toàn ở rubric/content layer?
