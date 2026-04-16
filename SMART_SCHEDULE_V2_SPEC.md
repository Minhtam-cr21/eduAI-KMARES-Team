# Smart Schedule V2 Spec

**Date:** 2026-04-16  
**Scope:** Upgrade Track 2 - nâng lớp `study_schedule` từ rule-based nền thành Smart Schedule V2 theo hướng additive.  
**Rule:** `study_schedule` vẫn là source of truth; teacher vẫn là người duyệt cuối.

## 1. Mục tiêu

Smart Schedule V2 bổ sung 4 lớp mới trên foundation hiện có:

1. Priority model cho từng schedule item.
2. Soft-deadline policy nhiều mức thay cho một rule `+1 day` duy nhất.
3. Weekly learning analysis giàu tín hiệu hơn nhưng vẫn giữ `summary` / `analysis` cũ tương thích.
4. Deterministic teacher recommendation + minimal persistence cho decision/override log.

Track này không làm:

- full calendar drag-drop
- redesign lớn UI
- thay `study_schedule` bằng bảng khác
- bỏ teacher review khỏi workflow

## 2. Contracts additive mới

### `SchedulePriority`

- `critical`
- `high`
- `normal`
- `light`

### `SoftDeadlineLevel`

- `level_1`
- `level_2`
- `level_3`
- `level_4`

### `WeeklyLearningAnalysis`

Mỗi tuần gồm:

- `week_start`
- `week_end`
- `total_items`
- `pending_items`
- `completed_items`
- `overdue_items`
- `slip_count`
- `risk_level`
- `high_load_detected`
- `imbalance_detected`

### `TeacherScheduleRecommendation`

- `recommendation_type`
  - `keep_pace`
  - `reduce_load`
  - `change_priority`
  - `needs_intervention`
- `priority`
- `rationale`
- `recommended_action`
- `target_item_ids`

### `ScheduleAdjustmentProposal`

- `item_id`
- `priority`
- `soft_deadline_level`
- `proposed_due_date`
- `proposal_reason`
- `suggested_action`

## 3. Priority model

Priority V2 được tính deterministic từ:

- khoảng cách tới `due_date`
- `miss_count`
- trạng thái `overdue` / `frozen`
- tuần có `high_load_detected` hoặc `imbalance_detected`
- `learner_profile.risk_flags`
- `ai_analysis.recommended_pacing`

Fallback:

- nếu không có `learner_profile` / `ai_analysis`, engine vẫn chạy đủ bằng rule-based signals từ lịch
- không phụ thuộc AI để có output

## 4. Soft deadline policy nhiều mức

### Level 1

- dời nhẹ
- gần behavior cũ nhất
- thường là `+1 day`

### Level 2

- giảm tải tuần
- dời xa hơn level 1
- ưu tiên khi đã có slip nhưng chưa tới ngưỡng rebalance mạnh

### Level 3

- tái cân bằng task sau
- ngoài việc dời item hiện tại, có thể dời thêm một số pending item kế tiếp trong cùng path

### Level 4

- freeze có kiểm soát
- set `study_schedule.status = frozen`
- set `frozen_until`
- gửi signal để teacher review

Compatibility:

- behavior cũ `+1 day` vẫn được giữ ở level 1
- policy mới chỉ là lớp quyết định additive

## 5. Weekly analysis V2

`summary` cũ vẫn giữ:

- `total`
- `pending`
- `completed`
- `overdue`
- `frozen`
- estimated hours vẫn `null` nếu chưa có nguồn bền vững

`analysis` cũ vẫn giữ:

- `analysis_source`
- `as_of_date`
- `weekly_load`
- `recommendations`

`analysis` mới bổ sung additive:

- `engine_version = smart_schedule_v2`
- `weekly_analysis`
- `total_slip_count`
- `high_load_detected`
- `imbalance_detected`
- `recommended_pacing`
- `teacher_recommendations`
- `adjustment_proposals`

## 6. Teacher recommendation strategy

Recommendation deterministic được suy ra từ:

- overdue count
- frozen count
- slip count
- high-load tuần
- imbalance tuần
- learner pacing/risk nếu có

Output chính:

- giữ nhịp
- giảm tải
- đổi ưu tiên
- cần can thiệp

Không có phụ thuộc bắt buộc vào model call.

## 7. Persistence tối thiểu

### Bảng mới

- `schedule_adjustment_logs`

Mục tiêu:

- lưu compact decision log cho system policy
- lưu teacher override priority/pacing
- không copy toàn bộ `study_schedule` items

Field chính:

- `user_id`
- `schedule_item_id`
- `teacher_id`
- `path_id`
- `adjustment_source`
- `adjustment_level`
- `priority_before`
- `priority_after`
- `pacing_override`
- `decision_note`
- `snapshot`
- `created_at`

### Persistence hiện có vẫn giữ

- `teacher_review_events` tiếp tục là review/audit layer cho teacher schedule insight
- V2 chỉ mở rộng compact snapshot của schedule review

## 8. API / edge behavior sau V2

### `GET /api/study-schedule`

Giữ:

- `items`
- `summary`
- `analysis`

Mở rộng additive:

- item-level `priority`
- item-level `soft_deadline_level`
- item-level `priority_score`
- item-level `adjustment_proposal`
- analysis-level `weekly_analysis`
- analysis-level `teacher_recommendations`
- analysis-level `adjustment_proposals`

### `GET /api/teacher/students/[id]/schedule`

Giữ:

- `student`
- `items`
- `summary`
- `analysis`
- `latestReview`
- `reviewHistory`

Mở rộng additive:

- V2 analysis payload như student route

### `POST /api/teacher/students/[id]/schedule`

Giữ:

- teacher review persistence cũ

Mở rộng additive:

- optional `targetItemId`
- optional `overridePriority`
- optional `overridePacing`
- optional `overrideLevel`

Nếu teacher gửi override, server append compact `schedule_adjustment_logs` record.

### Edge Function `handle-missed-deadlines`

Trước V2:

- mọi pending overdue item đều `+1 day`

Sau V2:

- level 1: dời nhẹ
- level 2: giảm tải tuần
- level 3: tái cân bằng thêm task sau
- level 4: freeze có kiểm soát + email teacher review
- mọi action được log compact vào `schedule_adjustment_logs`

## 9. Compatibility

Compatibility được giữ bằng cách:

- `study_schedule` vẫn là source of truth
- `teacher_review_events` vẫn là review history layer
- `summary` và `analysis.recommendations` cũ vẫn tồn tại
- consumer cũ không cần đọc field mới vẫn chạy
- không thay shape bắt buộc của item cũ; chỉ thêm metadata additive

## 10. CẦN XÁC NHẬN

- Team có chấp nhận `level_4` freeze mặc định 7 ngày như guardrail phase này không?
- `schedule_adjustment_logs` có nên trở thành nguồn audit chuẩn cho mọi override future phase, hay chỉ giữ mức tối thiểu cho V2?
- Teacher override hiện được log additive; có muốn phase sau cho phép apply override trực tiếp vào `study_schedule` rows qua một workflow duyệt rõ hơn không?
