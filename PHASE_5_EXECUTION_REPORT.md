# Phase 5 Execution Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 5  
**Scope guard:** Add persisted teacher review workflow for personalized path and schedule insights with minimal additive persistence, no major dashboard redesign, no learning schema merge.

## Mục tiêu phase

- Tạo workflow teacher review rõ hơn cho personalized path.
- Tạo workflow teacher review rõ hơn cho schedule insights.
- Persist mức tối thiểu các insight/action quan trọng thay vì chỉ read-time.
- Giữ compatibility với path và schedule APIs hiện có.
- Đảm bảo repo vẫn build pass.

## File đã sửa

- `lib/teacher/review-contracts.ts`
- `lib/teacher/review-store.ts`
- `lib/teacher/schedule-insight.ts`
- `app/api/personalized-path/teacher/route.ts`
- `app/api/personalized-path/teacher/by-student/[studentId]/route.ts`
- `app/api/personalized-path/teacher/[pathId]/approve/route.ts`
- `app/api/teacher/students/[id]/schedule/route.ts`
- `components/teacher/personalized-path-editor-client.tsx`
- `components/teacher/personalized-paths-list-client.tsx`
- `components/teacher/teacher-schedule-insights-client.tsx`
- `supabase/migrations/20260416010000_phase5_teacher_review_events.sql`
- `FINAL_REWORK_AUDIT.md`
- `PHASE_5_TEACHER_REVIEW_DESIGN.md`
- `PHASE_5_EXECUTION_REPORT.md`

## Migration nào thêm

- `supabase/migrations/20260416010000_phase5_teacher_review_events.sql`

Nội dung chính:
- thêm bảng `teacher_review_events`
- thêm index cho teacher / student / path lookups
- bật RLS
- thêm policy cho teacher/admin select + insert

Vì sao cần persist thay vì chỉ read-time:
- path review và schedule insight review cần có lịch sử cơ bản
- teacher note / adjustment / risk review không nên mất sau mỗi lần reload
- bảng mới chỉ lưu compact snapshot + note, không copy toàn bộ dữ liệu lớn

Ghi chú:
- Supabase CLI vẫn không có sẵn trong môi trường hiện tại, nên migration được thêm thủ công theo naming additive

## API nào thêm / sửa

### Mở rộng additive

- `GET /api/personalized-path/teacher`
  - thêm latest review metadata theo từng path

- `GET /api/personalized-path/teacher/by-student/[studentId]`
  - thêm:
    - `pathReview`
    - `pathReviewHistory`

- `POST /api/personalized-path/teacher`
  - giữ body cũ cho `studentId`, `courseSequence`, `status`
  - thêm optional review fields
  - vẫn lưu path như cũ, đồng thời append review event nếu có dữ liệu review

- `PUT /api/personalized-path/teacher/[pathId]/approve`
  - giữ flow approve cũ
  - append thêm review event tối thiểu khi teacher re-send path cho học sinh

- `GET /api/teacher/students/[id]/schedule`
  - giữ:
    - `student`
    - `items`
    - `summary`
    - `analysis`
  - thêm:
    - `latestReview`
    - `reviewHistory`

### API mới theo cùng surface

- `POST /api/teacher/students/[id]/schedule`
  - persist schedule insight review
  - server tính lại snapshot read-time rồi lưu compact review record

## Quyết định kỹ thuật

- Dùng một bảng append-only dùng chung cho hai kind:
  - `personalized_path`
  - `schedule_insight`
- Không tạo full snapshot/history table riêng cho từng domain.
- `personalized_paths` vẫn là SOT cho path content.
- `study_schedule` vẫn là SOT cho schedule content.
- Review table chỉ là audit / workflow layer.
- Schedule snapshot persisted chỉ gồm normalized summary + recommendations, không copy full items.
- Path review persisted giữ:
  - source
  - learner signals
  - reasoning
  - review status
  - review note / adjustment note

## Những gì đã hoàn thành

- Tạo shared contracts cho teacher reviews.
- Tạo storage helper cho insert/list review events.
- Tạo helper dùng chung để build teacher-visible schedule snapshot.
- Mở rộng teacher personalized path APIs để đọc/lưu review metadata.
- Mở rộng teacher schedule API để đọc/lưu review metadata.
- Mở rộng nhẹ teacher UI cho:
  - path review note / adjustment note / review status / history
  - schedule risk level / action recommendation / review note / history
- Giữ flow approve / revision hiện có.

## Build/check result

- `ReadLints` trên các file vừa sửa: **không có linter errors**
- `npm run build`: **PASS**

## Rủi ro còn lại

- `teacher_review_events` hiện là append-only; nếu product muốn edit/overwrite review thì phase sau cần thêm update workflow rõ ràng.
- Admin hiện có full access, còn student chưa có read surface cho review events; đây là chủ đích của Phase 5.
- `pathReviewHistory` và `reviewHistory` hiện lấy recent records; nếu lịch sử tăng lớn, phase sau có thể cần pagination.
- Schedule review snapshot hiện không lưu full weekly load để tránh duplicate payload; nếu product cần audit sâu hơn phải chốt snapshot depth sau.
- Review metadata chưa được hiển thị ở mọi teacher surface; Phase 5 chỉ gắn vào path editor, path list, và schedule insights page hiện có.

## CẦN XÁC NHẬN

- Product có muốn student sau này xem một phần teacher review note không, hay review events chỉ dành cho teacher/admin?
- Append-only review history hiện tại đã đủ chưa, hay phase sau cần “latest current review” materialized rõ ràng hơn?
- `teacher_review_events` có nên tiếp tục là bảng dùng chung cho cả AI insights khác trong tương lai, hay giữ riêng cho path/schedule workflow?
