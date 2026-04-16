# Phase 1 Execution Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 1  
**Scope guard:** Verify current repo state, correct audit drift, and stabilize phase documentation without expanding product scope or changing major schema.

## Mục tiêu phase

- Xác minh trạng thái thực tế của repo bằng đọc code và chạy build thật.
- Điều tra các điểm bị nghi lỗi build, đặc biệt `/teacher/connections` và `/teacher/courses/[courseId]/edit-v2`.
- Sửa các chỗ lệch giữa `FINAL_REWORK_AUDIT.md` và snapshot code/build hiện tại.
- Chuẩn bị báo cáo để mentor có thể review trước phase sau.

## File đã sửa

- `components/teacher/teacher-header.tsx`
- `app/(dashboard)/teacher/courses/[courseId]/edit-v2/page.tsx`
- `app/(dashboard)/teacher/courses/new-v2/page.tsx`
- `FINAL_REWORK_AUDIT.md`
- `PHASE_1_EXECUTION_REPORT.md`

## Lỗi gốc là gì

- Audit hiện tại có chỗ chưa khóa chặt bằng chứng runtime/build cho snapshot hiện tại, nhất là quanh teacher routes mới và hai route được yêu cầu kiểm tra.
- Nghi vấn lỗi build ở `/teacher/connections` và `/teacher/courses/[courseId]/edit-v2` **không tái hiện được** trên working tree hiện tại; cả hai route đều xuất hiện trong output `next build`.
- Một số teacher route mới vẫn có dấu hiệu chưa hoàn thiện ở mức UI review:
  - tiêu đề header cho nhánh `/teacher/courses/*` quá chung, dễ hiển thị sai ngữ cảnh,
  - `new-v2` và `edit-v2` còn chuỗi ASCII/không dấu.

## Cách sửa

- Chạy kiểm tra build thật bằng `npm run build` trên working tree hiện tại.
- Đối chiếu lại route/layout/nav student-teacher với code thực tế, gồm:
  - `app/(student)/**`
  - `app/(dashboard)/teacher/**`
  - `components/student/*`
  - `components/teacher/*`
- Cập nhật `FINAL_REWORK_AUDIT.md` để:
  - ghi rõ đã chạy build thật,
  - ghi rõ `/teacher/connections` và `/teacher/courses/[courseId]/edit-v2` hiện build được,
  - bổ sung rủi ro thực tế còn lại thay vì ghi nhận sai là lỗi build hiện hành.
- Chỉnh nhẹ teacher route UI:
  - làm rõ title mapping ở `teacher-header`,
  - chuẩn hóa copy ở `new-v2` và `edit-v2`.

## Kết quả build/check

- `npm run build`: **PASS**
- Build output đã compile các route:
  - `/teacher/connections`
  - `/teacher/courses/[courseId]/edit-v2`
  - `/teacher/path-review`
  - `/teacher/schedule-insights`
- `ReadLints` trên các file teacher route liên quan: **không có linter errors**

## Những gì còn chưa làm

- Chưa refactor sâu flow `/teacher/connections`; hiện vẫn có split giữa `/api/teacher/connection-requests` và `/api/connection-requests/*`.
- Chưa thay đổi luồng quản lý khóa học để đưa `edit-v2` thành entry point chính từ danh sách khóa học.
- Chưa đụng data model, migration, assessment, AI endpoint mới, hoặc schema lớn.
- Chưa xác minh trạng thái DB remote / Supabase production.

## CẦN XÁC NHẬN

- `edit-v2` có nên là luồng sửa khóa học chính thức trong teacher area hay chỉ là builder phụ song song với flow hiện tại?
- Teacher roster/product rule có yêu cầu "chỉ học sinh đã kết nối" hay chấp nhận danh sách rộng hơn như RPC hiện tại?
- Có cần phase sau chuẩn hóa tiếp copy/IA teacher mới (`path-review`, `schedule-insights`, `edit-v2`) hay chỉ giữ audit đúng trạng thái hiện tại?
