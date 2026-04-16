# Assessment Rubric Standard

**Date:** 2026-04-16  
**Scope:** Upgrade Track 1 - professionalization layer for existing assessment results.  
**Rule:** additive only, no question changes, no new model calls, no large DB schema changes.

## 1. Mục tiêu

Chuẩn hóa assessment hiện có thành hệ thống đánh giá 3 tầng:

1. **Baseline deterministic hiện có**
   - `mbti_type`
   - `mbti_dimensions`
   - `trait_scores`
   - `learner_profile`
   - `ai_analysis`
2. **Rubric chuẩn hóa 4 trụ**
   - `motivation`
   - `learning_style`
   - `foundation_skills`
   - `interest_alignment`
3. **Presentation views**
   - `StudentAssessmentView`
   - `TeacherAssessmentView`

Track này không thay raw scoring cũ; chỉ chuẩn hóa lớp đọc/diễn giải phía trên.

## 2. Contracts mới

### `AssessmentBand`

Band chuẩn:
- `Low`
- `Medium`
- `High`

### `AssessmentRubric`

Mỗi trụ gồm:
- `score`: `0..100`
- `band`: `Low | Medium | High`
- `short_interpretation`
- `path_implication`
- `schedule_implication`

Shape:

```ts
type AssessmentRubric = {
  motivation: AssessmentRubricPillar;
  learning_style: AssessmentRubricPillar;
  foundation_skills: AssessmentRubricPillar;
  interest_alignment: AssessmentRubricPillar;
};
```

### `StudentAssessmentView`

Mục tiêu:
- ít kỹ thuật
- dễ hiểu
- dùng trực tiếp cho student result page

Fields:
- `headline`
- `summary`
- `pacing_recommendation`
- `strengths`
- `support_needs`
- `next_steps`

### `TeacherAssessmentView`

Mục tiêu:
- nhấn readiness
- risk
- support strategy
- pacing
- intervention cues

Fields:
- `headline`
- `summary`
- `readiness_band`
- `pacing_guidance`
- `primary_risks`
- `support_strategies`
- `intervention_cues`

## 3. Mapping band

Current band mapping from existing scores:

- `Low`: `< 45`
- `Medium`: `45..74`
- `High`: `>= 75`

Lý do:
- đủ đơn giản để additive lên scoring hiện tại
- chưa phải đổi hàm `computeTraits(...)`
- dễ dùng đồng nhất cho student/teacher presentation

## 4. Mapping 4 trụ

### `motivation`

Nguồn:
- `trait_scores.motivation`
- `motivation_signals`
- `goal_summary`

Dùng để diễn giải:
- độ rõ mục tiêu
- độ bền động lực
- nhu cầu milestone ngắn

### `learning_style`

Nguồn:
- `trait_scores.learningStyle`
- `learning_style_signals`

Dùng để diễn giải:
- mức cần ví dụ / thực hành / cấu trúc rõ
- mức phù hợp với học đa hình thức

### `foundation_skills`

Nguồn:
- `trait_scores.foundationSkills`
- `risk_flags`
- tín hiệu từ `C*`

Dùng để diễn giải:
- readiness kỹ thuật
- mức cần front-load kiến thức nền
- khả năng tăng tốc hay không

### `interest_alignment`

Nguồn:
- `trait_scores.interests`
- `interests`
- `goal_summary`

Dùng để diễn giải:
- độ rõ định hướng
- mức nên chuyên sâu sớm hay nên exploratory hơn

## 5. Compatibility

Compatibility được giữ bằng cách:

- không đổi câu hỏi assessment
- không đổi `computeTraits(...)`
- không đổi `learner_profile`
- không đổi `ai_analysis`
- không thay payload cũ; chỉ **thêm**:
  - `rubric`
  - `student_view`
  - `teacher_view`

Các consumer cũ vẫn có thể tiếp tục đọc:
- `traits`
- `learner_profile`
- `ai_analysis`
- `analysis_source`
- `assessment_version`

## 6. UI usage

Student result page nên ưu tiên thứ tự:

1. summary dễ hiểu
2. pacing recommendation
3. 4 rubric pillars
4. strengths / support needs
5. learner profile / structured details

Teacher view contract được tạo sẵn cho phase sau nhưng Track 1 này không mở teacher UI mới.

## 7. Giới hạn của track này

- Không thêm model call mới
- Không dùng AI để sinh rubric
- Không động tới smart schedule
- Không động tới teacher IA/workflow khác
- Không biến rubric thành source of truth mới

Rubric chỉ là lớp professionalized interpretation trên baseline hiện có.

## 8. CẦN XÁC NHẬN

- Team có muốn giữ threshold band hiện tại (`45/75`) cho các track sau không?
- `TeacherAssessmentView` có nên tiếp tục nằm ở shared contract cho future teacher insight surfaces, hay chỉ dùng nội bộ path/schedule recommendation layer?
