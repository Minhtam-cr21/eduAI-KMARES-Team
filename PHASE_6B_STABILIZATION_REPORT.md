# Phase 6B Stabilization Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 6B  
**Scope guard:** Final stabilization only. No new product expansion, no major source-of-truth change, no new AI workflow.

## Mục tiêu phase

- Cleanup và giảm duplicate logic dễ drift sau rework.
- Siết contract cho các API additive Phase 3-5.
- Rà soát drift/dead-code ở mức an toàn.
- Chốt tài liệu trạng thái hoàn thành rework lõi.

## File đã sửa

### Code

- `app/api/study-schedule/route.ts`
- `lib/teacher/schedule-insight.ts`
- `lib/study-schedule/analysis.ts`
- `lib/study-schedule/contracts.ts`
- `lib/study-schedule/snapshot.ts`
- `lib/teacher/review-contracts.ts`
- `lib/assessment/path-generator.ts`

### Docs

- `PHASE_6B_STABILIZATION_REPORT.md`
- `REWORK_COMPLETION_STATUS.md`
- `FINAL_REWORK_AUDIT.md`

## Duplicate nào đã giảm

### Schedule enrichment giữa student / teacher routes

Đã trích shared helper:
- `lib/study-schedule/snapshot.ts`

Helper này gom:
- lọc `study_schedule` theo `personalized_paths` đang `active` / `paused`
- enrich `lesson` / `course`
- build `summary` / `analysis` từ cùng một snapshot

Kết quả:
- `app/api/study-schedule/route.ts` và `lib/teacher/schedule-insight.ts` dùng cùng logic snapshot
- giảm rủi ro student và teacher schedule drift semantics theo thời gian

## Contract nào đã siết

### Schedule contracts

Đã thêm:
- `lib/study-schedule/contracts.ts`

Schema mới khóa:
- `enrichedScheduleItem`
- `summary`
- `weekly_load`
- `analysis`

Tác dụng:
- schedule additive payload có contract dùng chung rõ hơn
- teacher review snapshot tái sử dụng cùng schema, tránh lặp định nghĩa

### Teacher review contracts

Đã siết trong:
- `lib/teacher/review-contracts.ts`

Nội dung:
- `teacherScheduleInsightSnapshotSchema` reuse `scheduleSummarySchema`
- `review_status`, `source`, `review_note`, `adjustment_note` được parse chặt hơn
- `created_at` parse theo datetime có offset

### Personalized path suggest contract

Đã siết trong:
- `lib/assessment/path-generator.ts`

Nội dung:
- output `generatePathFromAssessment(...)` được parse bằng `personalizedPathSuggestionSchema` trước khi trả ra route

Tác dụng:
- contract additive của Phase 4 được kiểm tra ngay tại source tạo payload

## Cleanup / drift audit

### Đã làm

- cleanup duplicate schedule enrichment bằng shared helper như trên

### Không làm vì chưa đủ bằng chứng để xóa an toàn

Các symbol nghi ngờ dead vẫn chưa bị xóa:
- `components/teacher/teacher-dashboard-client.tsx`
- `components/student/ai-roadmap-request-dialog.tsx`
- `components/student/enrolled-course-card.tsx`
- `components/student/complete-lesson-button.tsx`

Bằng chứng hiện có:
- search hiện chỉ thấy chính file định nghĩa và entry trong `FINAL_REWORK_AUDIT.md`
- chưa có import/runtime evidence đủ chắc để khẳng định xóa ngay là an toàn

Quyết định Phase 6B:
- chỉ tài liệu hóa rõ
- không xóa hàng loạt

## Build/check result

- `ReadLints` trên các file vừa sửa: **không có linter errors**
- `npm run build`: **PASS**

## Rủi ro còn lại

- Vẫn còn dual model lớn của repo (`courses` / legacy / `edu_*`), nhưng đây không phải phạm vi cleanup an toàn của Phase 6B.
- Dead-code nghi ngờ mới được audit lại, chưa được delete vì chưa đủ bằng chứng runtime.
- Teacher roster semantics và admin shell duplication vẫn là vấn đề sản phẩm/kiến trúc lớn, không xử lý trong phase này.
- Stabilization này giúp contract đáng tin hơn, nhưng không thay cho production hardening sâu hơn như integration tests, remote observability, hoặc contract test suite.

## CẦN XÁC NHẬN

- Team có muốn phase sau chỉ làm cleanup có bằng chứng import/runtime để xóa dứt điểm các component đang nghi ngờ dead không?
- `FINAL_REWORK_AUDIT.md` có nên được cập nhật tiếp như snapshot hậu Phase 6B hoàn chỉnh, hay giữ file hiện tại làm mốc audit ban đầu và dùng `REWORK_COMPLETION_STATUS.md` làm kết luận chính?
- “Core rework completed” có được team chấp nhận theo định nghĩa ở `REWORK_COMPLETION_STATUS.md`, trong khi production hardening sâu vẫn để future work?
