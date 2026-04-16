# Phase 6A DB Sync Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 6A  
**Scope guard:** No new feature expansion. Focus only on Supabase migration runbook, runtime hardening for missing remote schema, and audit/report updates.

## Mục tiêu phase

- Chuẩn hóa runbook để apply migration lên Supabase thật.
- Thêm guard tạm, nhẹ, để lỗi thiếu schema remote trả về rõ hơn.
- Tài liệu hóa các surface bị ảnh hưởng khi DB chưa sync.
- Giữ repo build pass.

## Surface phụ thuộc Phase 3 migration

Migration:
- `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`

Schema phụ thuộc:
- `career_orientations.learner_profile`
- `career_orientations.ai_analysis`
- `career_orientations.analysis_source`
- `career_orientations.assessment_version`

Surface bị ảnh hưởng:
- `POST /api/assessment/submit`
- `GET /api/assessment/result`
- `GET /api/assessment/status`
- `GET /api/personalized-path/suggest`
- `POST /api/personalized-path/suggest`

Nếu DB chưa sync:
- assessment submit có thể fail khi insert `career_orientations`
- assessment result/status có thể fail khi select cột mới
- path suggestion teacher flow có thể fail khi đọc `career_orientations` structured fields

## Surface phụ thuộc Phase 5 migration

Migration:
- `supabase/migrations/20260416010000_phase5_teacher_review_events.sql`

Schema phụ thuộc:
- bảng `teacher_review_events`

Surface bị ảnh hưởng:
- `GET /api/personalized-path/teacher`
- `GET /api/personalized-path/teacher/by-student/[studentId]`
- `PUT /api/personalized-path/teacher/[pathId]/approve`
- `GET /api/teacher/students/[id]/schedule`
- `POST /api/teacher/students/[id]/schedule`
- teacher path/schedule review UI tương ứng

Nếu DB chưa sync:
- teacher review history / latest review không tải được
- teacher schedule review không lưu được
- approve path có thể fail ở bước append review event

## Guard đã thêm

File mới:
- `lib/supabase/schema-sync.ts`

Guard này làm gì:
- nhận diện lỗi kiểu missing column / missing table / schema cache mismatch từ Supabase
- map lỗi đó sang `SchemaSyncError`
- trả response rõ hơn:
  - `status = 503`
  - `code = schema_not_synced`
  - có `phase`, `migration`, `relation`, `columns`

Đã áp dụng guard cho:
- `app/api/assessment/submit/route.ts`
- `lib/assessment/load-result.ts`
- `app/api/assessment/result/route.ts`
- `app/api/assessment/status/route.ts`
- `lib/assessment/path-generator.ts`
- `app/api/personalized-path/suggest/route.ts`
- `lib/teacher/review-store.ts`
- `app/api/personalized-path/teacher/route.ts`
- `app/api/personalized-path/teacher/by-student/[studentId]/route.ts`
- `app/api/personalized-path/teacher/[pathId]/approve/route.ts`
- `app/api/teacher/students/[id]/schedule/route.ts`

Lưu ý quan trọng:
- đây là **guard tạm để bảo vệ runtime và dễ debug**
- đây **không** phải giải pháp thay migration
- nếu remote chưa sync, route vẫn fail đúng nghĩa, chỉ fail rõ ràng hơn

## File đã thêm / sửa

### Thêm

- `lib/supabase/schema-sync.ts`
- `SUPABASE_MIGRATION_RUNBOOK.md`
- `PHASE_6A_DB_SYNC_REPORT.md`

### Sửa

- `app/api/assessment/submit/route.ts`
- `app/api/assessment/result/route.ts`
- `app/api/assessment/status/route.ts`
- `lib/assessment/load-result.ts`
- `lib/assessment/path-generator.ts`
- `app/api/personalized-path/suggest/route.ts`
- `lib/teacher/review-store.ts`
- `app/api/personalized-path/teacher/route.ts`
- `app/api/personalized-path/teacher/by-student/[studentId]/route.ts`
- `app/api/personalized-path/teacher/[pathId]/approve/route.ts`
- `app/api/teacher/students/[id]/schedule/route.ts`
- `FINAL_REWORK_AUDIT.md`

## Build/check result

- `ReadLints` trên các file vừa sửa: **không có linter errors**
- `npm run build`: **PASS**

## Rủi ro còn lại

- Runtime guard chỉ bắt được các pattern lỗi schema phổ biến; nếu remote DB lệch theo cách khác, team vẫn cần đọc SQL error thật.
- Local build pass vẫn không xác nhận remote Supabase đã sẵn sàng.
- Nếu migration được apply một phần và dừng giữa chừng, vẫn cần review thủ công trong SQL Editor.
- `teacher_review_events` chỉ được harden ở các surface hiện đang dùng; chưa có remote verification thực tế trong phase này.

## CẦN XÁC NHẬN

- Team có muốn dùng SQL Editor manual apply làm quy trình chính, hay cần thêm runbook CLI riêng sau khi môi trường có Supabase CLI?
- Sau khi apply migration thật, ai sẽ chịu trách nhiệm chạy checklist verify app-level trên environment remote?
- Có cần phase 6B bổ sung health-check/admin debug endpoint cho schema sync, hay chỉ giữ ở mức tài liệu + runtime guard như hiện tại?
