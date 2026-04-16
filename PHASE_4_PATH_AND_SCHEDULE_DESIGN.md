# Phase 4 Path And Schedule Design

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 4  
**Scope:** Dùng `learner_profile` / `ai_analysis` làm input chính cho personalized path generation, đồng thời bổ sung lớp phân tích deterministic cho `study_schedule` mà không đổi source of truth learning stack hoặc redesign lớn UI.

## 1. Personalized path generation flow mới

1. Teacher mở flow gợi ý path qua `GET /api/personalized-path/suggest?studentId=...`.
2. Route gọi `generatePathFromAssessment(...)` trong `lib/assessment/path-generator.ts`.
3. Path generator đọc theo thứ tự ưu tiên:
   - `profiles.goal`
   - `career_orientations.learner_profile`
   - `career_orientations.ai_analysis`
   - `career_orientations.suggested_courses`
   - published `courses` catalog
4. Nếu `learner_profile` hợp lệ:
   - dùng `mbti_type`, `goal_summary`, `constraint_summary`, `interests`, `risk_flags`
   - dùng `ai_analysis.path_focus`, `recommended_pacing`, `learner_summary`, `support_strategies`
   - build category priority và reasoning theo luật
5. Nếu `learner_profile` không hợp lệ hoặc chưa có:
   - mới fallback về `assessment_responses`
   - rebuild profile bằng deterministic Phase 3
6. Output route vẫn giữ:
   - `courseSequence`
   - `reasoning`
7. Output Phase 4 bổ sung additive:
   - `learnerSignalsUsed`
   - `analysisSource`

## 2. Dữ liệu đọc từ learner_profile / ai_analysis

### Từ `learner_profile`

- `mbti_type`
- `goal_summary`
- `constraint_summary`
- `interests`
- `learning_style_signals`
- `motivation_signals`
- `risk_flags`

### Từ `ai_analysis`

- `recommended_pacing`
- `learner_summary`
- `support_strategies`
- `path_focus`

### Từ profile / catalog hiện có

- `profiles.goal` được ưu tiên làm goal display nếu user đã có goal riêng ở profile
- `career_orientations.suggested_courses` vẫn là seed additive nếu course còn publish
- `courses` published catalog tiếp tục là catalog chính cho Phase 4, không merge sang `edu_*`

## 3. Fallback strategy nếu structured assessment chưa có

- Nếu `career_orientations.learner_profile` parse fail hoặc không tồn tại:
  - đọc `assessment_responses`
  - chạy `buildLearnerProfile(...)`
  - chạy `buildFallbackLearnerAnalysis(...)`
  - set `analysisSource = raw_answers_fallback`
- Nếu `learner_profile` hợp lệ nhưng `ai_analysis` thiếu hoặc invalid:
  - giữ `learner_profile` làm input chính
  - dùng rule-based fallback analysis
  - set `analysisSource = structured_profile`
- Nếu cả `learner_profile` và `ai_analysis` hợp lệ:
  - set `analysisSource = structured_profile_with_ai`

`assessment_responses` không còn là input mặc định; chỉ dùng khi structured layer chưa sẵn sàng.

## 4. Path generation contracts

File mới:
- `lib/personalized-path/contracts.ts`

Contract chính:
- `courseSequence[]`
  - `course_id`
  - `title`
  - `order_index`
  - `recommended_due_date_offset_days`
- `reasoning`
- `learnerSignalsUsed[]`
  - `key`
  - `label`
  - `value`
- `analysisSource`
  - `structured_profile_with_ai`
  - `structured_profile`
  - `raw_answers_fallback`

Compatibility:
- consumer cũ vẫn đọc được `courseSequence` và `reasoning`
- field mới chỉ additive, không đổi tên key cũ

## 5. Smart schedule analysis flow

### 5.1 Dữ liệu gốc

Phase 4 giữ nguyên bảng:
- `study_schedule`

Không thêm full calendar CRUD mới và không đổi shape row hiện có.

### 5.2 Lớp phân tích mới

File mới:
- `lib/study-schedule/analysis.ts`

Lớp này tính deterministic:
- `summary`
  - `total`
  - `pending`
  - `completed`
  - `overdue`
  - `frozen`
  - `estimated_hours_total`
  - `estimated_hours_pending`
- `analysis`
  - `analysis_source = rule_based`
  - `as_of_date`
  - `weekly_load[]`
  - `recommendations[]`

### 5.3 Quy tắc phân tích

- `overdue` chỉ tính khi:
  - `status = pending`
  - `due_date < today (UTC)`
- `weekly_load` gom theo tuần UTC để thống nhất với semantics của edge function trượt deadline
- `estimated_hours_total` và `estimated_hours_pending` đang để `null`
  - Phase 4 không bịa thời lượng
  - dữ liệu hiện tại chưa có nguồn thời lượng ổn định ở `study_schedule` rows

### 5.4 Recommendations rule-based

Recommendations được sinh từ:
- overdue count
- frozen count
- total `miss_count`
- tuần có tải cao nhất
- trạng thái on-track khi còn pending nhưng chưa overdue

Không có OpenAI call ở schedule flow Phase 4.

## 6. Teacher read surface dùng trong phase này

Teacher surface chính:
- `GET /api/teacher/students/[id]/schedule`

Route này tiếp tục trả:
- `student`
- `items`
- `summary`

Phase 4 bổ sung additive:
- `analysis`

Mục tiêu:
- teacher có thể đọc snapshot ổn định từ API
- UI hiện tại không bị phá nếu chưa dùng field mới

## 7. API nào được mở rộng

### Mở rộng

- `GET /api/personalized-path/suggest`
- `POST /api/personalized-path/suggest`
  - thêm `learnerSignalsUsed`
  - thêm `analysisSource`

- `GET /api/study-schedule`
  - thêm `summary`
  - thêm `analysis`

- `GET /api/teacher/students/[id]/schedule`
  - giữ `summary`
  - thêm `analysis`
  - `summary` được tính bằng helper dùng chung với student route

### Không đổi shape cũ

- `courseSequence`
- `reasoning`
- `items`
- `summary.total/pending/completed/overdue`

## 8. Bảng / cột / migration

### Đọc từ bảng hiện có

- `career_orientations`
  - `learner_profile`
  - `ai_analysis`
  - `analysis_source`
  - `suggested_courses`
  - `mbti_type`
- `profiles`
  - `goal`
  - `mbti_type`
- `assessment_responses`
  - chỉ fallback
- `courses`
  - published catalog
- `study_schedule`
- `personalized_paths`

### Migration

- Không thêm migration ở Phase 4
- Không thêm snapshot persistence mới vì API extension hiện tại đã đủ để teacher review

## 9. Những gì cố ý chưa làm

- Không merge `courses` với `edu_*`
- Không đổi teacher roster rule
- Không làm full drag-drop / full CRUD calendar
- Không thêm client-side OpenAI call
- Không biến AI thành nguồn duy nhất cho path suggestion
- Không redesign lớn student dashboard hoặc teacher dashboard
- Không persist event history chi tiết cho từng lần trượt deadline
- Không tính estimated hours giả định khi chưa có nguồn dữ liệu bền vững
