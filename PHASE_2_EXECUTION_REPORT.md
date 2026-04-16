# Phase 2 Execution Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 2  
**Scope guard:** Audit sâu source of truth hiện tại, khóa decision tạm thời cho teacher roster và teacher course edit flow, không thay đổi schema lớn hoặc mở rộng sản phẩm.

## Mục tiêu phase

- Khóa rõ source of truth hiện tại cho courses, lessons, enrollments, progress.
- Giảm drift kiến trúc ở mức tối thiểu mà không phá dữ liệu.
- Chuẩn hóa decision tạm thời cho teacher roster.
- Làm rõ teacher course edit flow bằng sửa rất nhẹ ở nhãn/copy.

## File đã sửa

- `app/api/teacher/students/route.ts`
- `lib/teacher/dashboard-stats.ts`
- `components/teacher/teacher-courses-manager.tsx`
- `app/(dashboard)/teacher/courses/page.tsx`
- `FINAL_REWORK_AUDIT.md`
- `PHASE_2_ARCHITECTURE_DECISION.md`
- `PHASE_2_EXECUTION_REPORT.md`

## Phát hiện chính

- Repo hiện **chưa có một learning source of truth duy nhất**.
- Stack `courses` / `course_lessons` / `user_courses` / `user_course_progress` vẫn là nguồn chính cho:
  - teacher course manager hiện tại
  - student hub `/student/courses`
  - legacy enrolled/progress aggregate
- Stack `edu_*` là **active parallel path** cho:
  - `new-v2`
  - `edit-v2`
  - `/api/v2/*`
  - một phần student detail / learn flow
- `learning_paths` vẫn active nhưng là **domain roadmap riêng**, không phải course progress canonical chung.
- Teacher roster hiện tại qua `/api/teacher/students` và `teacher_list_students_with_stats` đang tương đương **all students**.
- Completed-assessment queue và teacher schedule visibility lại hẹp hơn, đang theo connection/path scope.
- Teacher course edit flow hiện tại bị split:
  - classic manager + curriculum cho `courses`
  - `new-v2` + `edit-v2` cho `edu_courses`

## Quyết định kỹ thuật tạm thời

- **Không đổi logic roster** ở Phase 2.
- **Không đổi canonical schema** ở Phase 2.
- Tạm thời ghi nhận:
  - `courses` stack = active primary cho hub/catalog hiện tại
  - `edu_*` stack = active parallel
  - `learning_paths` = active separate domain
- Với teacher course edit flow:
  - classic course edit vẫn là flow chính cho `courses`
  - `edit-v2` được gọi rõ là builder riêng của Edu V2, không ngụy trang thành flow chính thức của catalog cũ

## Cách sửa đã làm

- Thêm TODO kỹ thuật đúng chỗ ở:
  - `app/api/teacher/students/route.ts`
  - `lib/teacher/dashboard-stats.ts`
- Chuẩn hóa copy/label nhẹ ở teacher courses:
  - làm rõ bảng hiện tại là catalog/classic flow
  - làm rõ Edu V2 là builder riêng
  - đổi nhãn `Bài học` thành `Giáo trình` để khớp `curriculum`
- Cập nhật `FINAL_REWORK_AUDIT.md` để phản ánh kết luận Phase 2.
- Tạo `PHASE_2_ARCHITECTURE_DECISION.md` để khóa decision tạm thời cho Phase 3.

## Kiểm tra đã chạy

- `npm run build`: **PASS**
- `ReadLints` trên các file vừa sửa: **không có linter errors**

## Rủi ro còn lại

- Student experience vẫn bị split giữa legacy stack và Edu V2 stack.
- `learning_paths` còn dễ bị hiểu nhầm là progress SOT chung nếu phase sau không khóa thuật ngữ.
- Teacher roster hiện đang global, nhưng một số flow teacher khác lại scoped hơn; nếu phase sau đổi logic mà không đồng bộ dashboard/RPC/UI sẽ dễ regress.
- `edit-v2` hiện đã rõ hơn ở mặt copy, nhưng vẫn chưa có unified teacher index cho Edu V2 courses.

## CẦN XÁC NHẬN

- Product muốn teacher roster theo rule nào:
  - all students
  - connected students only
- Phase 3 có ưu tiên thống nhất **read surface** của student courses trước khi bàn chuyện hợp nhất schema không?
- Edu V2 có cần trở thành flow chính thức trong teacher area, hay vẫn giữ là nhánh parallel có chủ đích?
