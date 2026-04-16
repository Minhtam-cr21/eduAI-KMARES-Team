# Phase 2 Architecture Decision

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 2  
**Scope:** Khóa source of truth hiện tại cho learning domain, teacher roster rule, và teacher course edit flow mà không phá dữ liệu hay refactor lớn.

## 1. Source of truth hiện tại theo domain

| Domain | Source of truth hiện tại | Trạng thái |
|--------|---------------------------|-----------|
| `courses` | Nguồn chính cho teacher course manager, course catalog cũ, và student hub `/student/courses` | **Active** |
| `course_lessons` | Nguồn lesson structure chính cho catalog cũ, curriculum editor, legacy learn flow fallback | **Active** |
| `user_courses` | Enrollment chính cho student hub "khóa học của tôi" và gating legacy learn flow | **Active** |
| `user_course_progress` | Progress chính cho legacy course experience và progress aggregate ở student hub | **Active** |
| `edu_courses` | Nguồn cho Edu V2 detail, builder V2, explore merge, và nhánh V2 của lesson flow | **Active parallel** |
| `edu_modules` / `edu_lessons` | Structure và lesson identity của Edu V2 | **Active parallel** |
| `edu_enrollments` | Enrollment của Edu V2 qua `/api/v2/*` | **Active parallel** |
| `edu_student_progress` | Progress của Edu V2 qua `/api/v2/lessons/*/progress` và `/api/v2/courses/*/my-progress` | **Active parallel** |
| `learning_paths` | Dùng cho roadmap / teacher progress view / lesson completion riêng của legacy roadmap domain | **Active separate domain** |

## 2. Phân loại active / parallel / legacy

### Active

- `courses`
- `course_lessons`
- `user_courses`
- `user_course_progress`

Đây là stack đang chi phối các bề mặt sản phẩm sau:
- teacher course manager hiện tại
- student enrolled courses hub
- phần lớn logic curriculum/classic course editing

### Active parallel

- `edu_courses`
- `edu_modules`
- `edu_lessons`
- `edu_enrollments`
- `edu_student_progress`

Đây là nhánh Edu V2 đang chạy thật, nhưng chưa thay thế stack cũ ở mọi entry point. Nó có:
- create flow riêng qua `new-v2`
- builder riêng qua `edit-v2`
- API riêng `/api/v2/*`
- student detail / learn branch riêng khi route nhận diện được course V2

### Active nhưng semantic riêng

- `learning_paths`

Domain này không nên bị hiểu nhầm là course progress canonical. Nó đại diện cho:
- roadmap / lộ trình
- completion semantics gắn với bảng `lessons`
- teacher progress summary hiện tại ở vài route

### Legacy hoặc không phải canonical product path

- `topics`
- `lessons` (khi xét như content model cũ ngoài `learning_paths`)
- các flow cũ gắn trực tiếp với roadmap/lesson legacy không thuộc stack `courses` hoặc `edu_*`

## 3. Quyết định tạm thời cho Phase 3

### Quyết định 1: chưa hợp nhất source of truth vật lý

- Chưa có đủ điều kiện để tuyên bố `edu_*` đã thay thế hoàn toàn `courses/*`.
- Tạm thời giữ ranh giới rõ ràng:
  - student hub và teacher catalog hiện tại dựa trên `courses` stack,
  - Edu V2 là nhánh song song có runtime thật nhưng chưa là canonical toàn hệ.

### Quyết định 2: teacher roster giữ nguyên behavior hiện tại, chỉ khóa nghĩa

- Hiện tại `/api/teacher/students` = **all students** cho teacher/admin.
- Không đổi logic ở Phase 2.
- Ghi rõ rằng đây là behavior hiện tại, không phải quyết định sản phẩm cuối cùng.
- Các flow hẹp hơn như completed-assessment queue hoặc study schedule vẫn đang connection/path scoped.

### Quyết định 3: teacher course edit flow phải được gọi tên rõ

- Với stack `courses`, luồng chỉnh sửa chính thức hiện tại là:
  - course manager
  - modal sửa metadata
  - `curriculum`
- Với stack Edu V2, luồng chính thức hiện tại là:
  - `new-v2`
  - `edit-v2`
- Không coi `edit-v2` là equivalent thay thế cho edit flow của `courses` ở Phase 2.

### Quyết định 4: chưa đổi progress canonical

- `user_course_progress` vẫn là canonical cho legacy course experience.
- `edu_student_progress` vẫn là canonical bên trong Edu V2.
- `learning_paths` không được dùng như progress SOT chung cho toàn bộ student learning experience.

## 4. Những gì chưa được phép đụng vào

- Không migration destructive.
- Không gộp bảng hoặc đổi khóa định danh giữa `courses` và `edu_courses`.
- Không đổi behavior teacher roster nếu chưa có xác nhận sản phẩm rõ ràng.
- Không refactor lớn builder `edit-v2`.
- Không thêm assessment flow mới.
- Không thêm AI endpoint mới.
- Không tuyên bố production-ready hoặc đã thống nhất canonical schema cuối cùng.

## 5. Ghi chú thực thi cho phase sau

- Nếu Phase 3 muốn giảm drift student experience, ưu tiên xử lý **read surface** trước:
  - thống nhất cách student nhìn thấy enrolled courses,
  - xác định rõ course stack nào được coi là primary trên UI,
  - tránh merge schema trước khi merge trải nghiệm đọc dữ liệu.
- Nếu Phase 3 muốn siết teacher roster, phải chốt trước một rule duy nhất:
  - all students
  - connected students only
  - hoặc hybrid rule có mô tả rõ từng màn hình
