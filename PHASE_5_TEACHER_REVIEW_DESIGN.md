# Phase 5 Teacher Review Design

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 5  
**Scope:** Tạo workflow review rõ hơn cho teacher trên personalized path và schedule insights, với persistence additive tối thiểu để không còn hoàn toàn ephemeral.

## 1. Teacher review flow cho personalized path

1. Teacher mở `personalized path` editor của một học sinh.
2. UI tiếp tục đọc:
   - path hiện tại từ `personalized_paths`
   - suggestion metadata từ Phase 4:
     - `analysisSource`
     - `learnerSignalsUsed`
     - `reasoning`
3. Teacher thêm:
   - `review_status`
   - `review_note`
   - `adjustment_note`
4. Khi teacher lưu path hoặc gửi cho học sinh:
   - `personalized_paths` vẫn là SOT cho `course_sequence` và workflow status
   - đồng thời một record review nhỏ được append vào bảng review events
5. Teacher vẫn dùng flow cũ:
   - `draft`
   - `pending_student_approval`
   - approve / revision hiện có

## 2. Teacher review flow cho schedule insights

1. Teacher mở `/teacher/schedule-insights`.
2. UI tiếp tục đọc snapshot read-time từ:
   - `GET /api/teacher/students/[id]/schedule`
   - gồm `items`, `summary`, `analysis`
3. Teacher thêm review ngắn cho snapshot hiện tại:
   - `review_status`
   - `risk_level`
   - `action_recommendation`
   - `review_note`
4. Khi lưu:
   - server tính lại snapshot deterministic hiện tại từ `study_schedule`
   - chỉ persist snapshot rút gọn + teacher note
   - không copy toàn bộ items list

## 3. Bảng mới / cột / API mới hoặc mở rộng

### 3.1 Bảng mới

- `public.teacher_review_events`

Mục đích:
- append-only history cơ bản cho teacher review
- dùng chung cho:
  - `personalized_path`
  - `schedule_insight`

Field chính:
- `teacher_id`
- `student_id`
- `path_id` nullable
- `review_kind`
- `review_status`
- `risk_level` nullable
- `source` nullable
- `action_recommendation` nullable
- `review_note` nullable
- `adjustment_note` nullable
- `snapshot jsonb`
- `created_at`

Lý do cần persist thay vì chỉ read-time:
- teacher cần audit/history cơ bản cho quyết định review
- path/schedule insights không nên mất hoàn toàn sau mỗi lần reload
- vẫn tránh schema lớn bằng cách chỉ lưu compact snapshot + note

### 3.2 API mở rộng

- `GET /api/personalized-path/teacher`
  - thêm latest review metadata theo path
- `GET /api/personalized-path/teacher/by-student/[studentId]`
  - thêm:
    - `pathReview`
    - `pathReviewHistory`
- `POST /api/personalized-path/teacher`
  - body cũ giữ nguyên
  - thêm optional review fields:
    - `reviewStatus`
    - `reviewNote`
    - `adjustmentNote`
    - `suggestionSource`
    - `reasoning`
    - `learnerSignalsUsed`
    - `pathStatus`
- `PUT /api/personalized-path/teacher/[pathId]/approve`
  - giữ behavior cũ
  - append thêm một review event tối thiểu

- `GET /api/teacher/students/[id]/schedule`
  - giữ:
    - `student`
    - `items`
    - `summary`
    - `analysis`
  - thêm:
    - `latestReview`
    - `reviewHistory`
- `POST /api/teacher/students/[id]/schedule`
  - route mới theo cùng surface
  - dùng để persist schedule insight review

## 4. Field nào persisted, field nào vẫn read-time

### Persisted

#### Personalized path review

- `review_status`
- `review_note`
- `adjustment_note`
- `source`
- compact snapshot:
  - `reasoning`
  - `suggestion_source`
  - `learner_signals_used`
  - `path_status`
  - `sequence_length`

#### Schedule insight review

- `review_status`
- `risk_level`
- `action_recommendation`
- `review_note`
- compact snapshot:
  - `summary`
  - `analysis_source`
  - `as_of_date`
  - `recommendations`

### Vẫn read-time

- full `study_schedule` items
- full enriched lesson/course joins cho schedule page
- current `personalized_paths.course_sequence`
- current path suggestion payload từ Phase 4

## 5. Shared contracts

File:
- `lib/teacher/review-contracts.ts`

Contracts chính:
- `teacherPathReviewRecord`
- `teacherScheduleInsightReviewRecord`
- create schemas cho:
  - path review
  - schedule review
- snapshot schemas riêng cho từng kind

## 6. Compatibility strategy

- `personalized_paths` vẫn là SOT cho path content và status
- `study_schedule` vẫn là SOT cho lịch
- bảng mới chỉ là review/audit layer
- API cũ không bị đổi key bắt buộc
- field mới chỉ additive
- consumer cũ chỉ đọc shape cũ vẫn chạy

## 7. RLS strategy

- `teacher_review_events` bật RLS
- teacher chỉ `SELECT` / `INSERT` review events của chính mình
- admin có full access
- không thêm student read policy trong phase này vì scope là teacher workflow

## 8. Những gì cố ý chưa làm trong phase này

- Không làm full analytics dashboard mới
- Không persist full schedule item snapshots
- Không thêm AI endpoint mới
- Không đổi teacher roster rule
- Không merge `courses` với `edu_*`
- Không redesign lớn teacher dashboard
- Không thêm update/delete workflow cho review events; Phase 5 dùng append-only history tối thiểu
- Không biến review table thành source of truth cho path hoặc schedule
