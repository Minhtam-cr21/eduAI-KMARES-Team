# Optimization Sprint 1 Report

**Date:** 2026-04-16  
**Scope:** UX/performance optimization only. No new feature scope, no DB schema changes.

## Mục tiêu sprint

- Tối ưu điều hướng giữa các màn student/teacher chính.
- Giảm fetch thừa và duplicate client loading.
- Cải thiện perceived performance bằng loading/skeleton hợp lý.
- Giữ nguyên product scope hiện tại.

## Route nào đã tối ưu

### `/student`

Vấn đề trước đó:
- page fetch `/api/user/profile` hoàn toàn ở client sau mount
- khi vào dashboard vẫn có độ trễ trước khi tên/avatar hiện ra

Đã sửa:
- chuyển initial profile summary sang server read
- giữ UI hiện tại, chỉ bỏ client fetch ban đầu
- thêm `prefetch` rõ cho các link điều hướng chính

Loại cải thiện:
- giảm delay initial render thật
- cải thiện perceived performance khi bấm các pillar

### `/student/courses`

Vấn đề trước đó:
- toàn bộ danh sách enrolled courses fetch client-side sau mount
- page có skeleton nội bộ nhưng vẫn bị blank-to-fetch pattern

Đã sửa:
- trích `loadStudentEnrolledCourses(...)` dùng chung
- page render initial data ở server
- API `GET /api/user/courses/enrolled` reuse cùng helper
- thêm prefetch cho link chính

Loại cải thiện:
- giảm client fetch ban đầu thật
- giảm duplicate logic giữa page và API

### `/study-schedule`

Vấn đề trước đó:
- toàn bộ schedule snapshot fetch client-side sau mount
- có thêm client-side POST activity trong effect
- page load đầu chậm hơn cần thiết

Đã sửa:
- tách `StudyScheduleClient`
- page server load initial `study_schedule` snapshot trước
- client chỉ giữ refresh sau hành động complete
- thêm `loading.tsx` riêng cho segment
- thêm prefetch cho link điều hướng chính

Loại cải thiện:
- giảm delay initial render thật
- loading segment cải thiện perceived performance khi điều hướng

### `/personalized-roadmap`

Vấn đề trước đó:
- server page đã ổn, nhưng thiếu route-level loading khi điều hướng

Đã sửa:
- thêm `app/(student)/personalized-roadmap/loading.tsx`

Loại cải thiện:
- chủ yếu là perceived performance

### `/teacher`

Vấn đề trước đó:
- `TeacherDashboardHomeTabs` fetch thêm 2 request client-side sau mount:
  - completed-assessment pending students
  - notifications
- dashboard nhìn như đủ dữ liệu stats nhưng tabs khác vẫn chờ load tiếp

Đã sửa:
- thêm helper server-side:
  - `loadCompletedAssessmentPendingStudents(...)`
  - `loadTeacherNotifications(...)`
- page server bơm initial data vào tabs
- tabs chỉ fetch lại khi user bấm refresh/action
- thêm route-level `loading.tsx` cho teacher segment

Loại cải thiện:
- giảm fetch mount thừa thật
- cải thiện perceived performance khi mở dashboard teacher

### `/teacher/personalized-paths/[studentId]`

Vấn đề trước đó:
- page là client component chỉ để đọc `useParams`
- `PersonalizedPathEditorClient` fetch `/api/.../by-student/...`
- nếu chưa có path thì lại fetch tiếp `/api/personalized-path/suggest`
- thành waterfall rõ ràng

Đã sửa:
- page chuyển về server component nhận `params`
- tạo helper `loadTeacherPersonalizedPathEditorData(...)`
- route `GET /api/personalized-path/teacher/by-student/[studentId]` reuse helper
- nếu chưa có path, helper trả luôn `suggested` trong initial load
- client editor nhận `initialData` để render ngay, chỉ fallback fetch khi thật sự cần

Loại cải thiện:
- giảm waterfall request thật
- giảm thời gian chờ trước khi editor usable

### `/teacher/schedule-insights`

Vấn đề trước đó:
- page mount phải fetch danh sách học sinh trước, rồi user mới thấy select usable
- detail vẫn là fetch theo student selection

Đã sửa:
- page server load sẵn roster ban đầu bằng RPC hiện có
- client nhận `initialStudents`
- chỉ còn detail fetch khi chọn học sinh
- dùng `startTransition` khi đổi student để chuyển trạng thái mượt hơn

Loại cải thiện:
- giảm fetch mount thừa thật
- perceived performance tốt hơn khi đổi student

## API read-heavy đã tối ưu / ảnh hưởng

- `GET /api/user/courses/enrolled`
  - reuse helper `loadStudentEnrolledCourses(...)`
- `GET /api/personalized-path/teacher/by-student/[studentId]`
  - reuse helper `loadTeacherPersonalizedPathEditorData(...)`
  - trả luôn `suggested` nếu chưa có path để tránh waterfall phía client

## Chỗ nào chủ yếu cải thiện perceived performance

- `loading.tsx` cho:
  - `app/(student)/student/loading.tsx`
  - `app/(student)/study-schedule/loading.tsx`
  - `app/(student)/personalized-roadmap/loading.tsx`
  - `app/(dashboard)/teacher/loading.tsx`
- prefetch rõ hơn trên các link điều hướng chính
- `startTransition` khi đổi student ở teacher schedule insights

## File đã sửa / thêm

### Thêm

- `lib/user-courses/enrolled.ts`
- `lib/user/profile.ts`
- `lib/teacher/dashboard-home.ts`
- `lib/teacher/personalized-path-editor.ts`
- `app/(student)/study-schedule/study-schedule-client.tsx`
- `app/(student)/student/loading.tsx`
- `app/(student)/study-schedule/loading.tsx`
- `app/(student)/personalized-roadmap/loading.tsx`
- `app/(dashboard)/teacher/loading.tsx`
- `OPTIMIZATION_SPRINT_1_REPORT.md`

### Sửa

- `app/(student)/(dashboard)/student/page.tsx`
- `components/student/student-dashboard-modules.tsx`
- `app/(student)/student/courses/page.tsx`
- `app/api/user/courses/enrolled/route.ts`
- `app/(student)/study-schedule/page.tsx`
- `app/(dashboard)/teacher/page.tsx`
- `components/teacher/teacher-dashboard-home-tabs.tsx`
- `app/(dashboard)/teacher/personalized-paths/[studentId]/page.tsx`
- `components/teacher/personalized-path-editor-client.tsx`
- `app/api/personalized-path/teacher/by-student/[studentId]/route.ts`
- `app/(dashboard)/teacher/schedule-insights/page.tsx`
- `components/teacher/teacher-schedule-insights-client.tsx`

## Build/check result

- `ReadLints` trên các file vừa sửa: **không có linter errors**
- `npm run build`: **PASS**

## Rủi ro còn lại

- `teacher/schedule-insights` vẫn phải fetch detail theo học sinh sau khi chọn; sprint này chỉ giảm delay ban đầu, không đổi product/API scope để bundle toàn bộ data lớn sẵn.
- `teacher` dashboard vẫn còn action refresh riêng cho notifications/pending students; chưa chuyển sang realtime/subscription.
- `study-schedule` vẫn cần client refresh sau action complete; chưa đưa vào optimistic UI để tránh tăng rủi ro hành vi.
- Một số surface khác ngoài danh sách ưu tiên vẫn còn client-side fetch pattern cũ.
- Không có profiling số liệu runtime thật trong sprint này; tối ưu dựa trên code path và request topology.

## CẦN XÁC NHẬN

- Team có muốn Sprint 2 tiếp tục theo hướng “server-first initial data” cho các surface read-heavy còn lại không?
- Có cần thêm đo đạc rõ hơn bằng browser/network profiling cho các route chính để lượng hóa cải thiện sau sprint này không?
- Teacher dashboard có nên gom tiếp completed-assessment/notifications vào cùng một server bundle/helper rõ hơn trong phase tối ưu sau, hay mức hiện tại đã đủ an toàn?
