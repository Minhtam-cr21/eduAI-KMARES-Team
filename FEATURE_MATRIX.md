# EduAI — Ma trận tính năng & vai trò

**Căn cứ:** `app/**`, `middleware.ts`, `components/student/student-nav.tsx`, `components/teacher/teacher-sidebar.tsx`, `app/api/**`.  
**Yêu cầu sản phẩm (input):** Học sinh giữ login/signup; dashboard học sinh **chỉ** Khóa học, Lộ trình cá nhân hóa, Lịch học thông minh, Profile. Giáo viên tạo khóa học; AI phân tích lịch trình, tiến độ, hành vi; insight cho GV; GV cùng AI đề xuất cải thiện lộ trình/lịch cá nhân hóa.

---

## 1. Đối chiếu yêu cầu ↔ repo hiện tại

| Yêu cầu | Trạng thái trong repo | Ghi chú |
|---------|----------------------|---------|
| Login / signup | **Có** | `(auth)/login`, `signup`, `lib/actions/auth.ts`, OAuth callback. |
| Dashboard học sinh đúng 4 mục | **Chưa khớp** | `student-nav` và trang `/student` có Quiz, Trắc nghiệm, Roadmap, Kết nối GV, Lộ trình, v.v. → **CẦN XÁC NHẬN** cách thu gọn UI (tách route vs ẩn vs gộp vào 4 hub). |
| Khóa học (học sinh) | **Có** | `/student/courses`, API `user/courses/*`, `courses/*`. |
| Lộ trình cá nhân hóa | **Có** | `/personalized-roadmap`, `personalized-path/*`, `teacher/personalized-paths`. |
| Lịch học thông minh | **Có** | `/study-schedule`, `study_schedule` + edge `handle-missed-deadlines`, API `study-schedule/*`. |
| Profile | **Có** | `/profile`, `api/user/profile`. |
| GV tạo khóa học | **Có** | `teacher/courses/*`, AI `generate-course`, `courses/from-ai`, builder v2. |
| AI phân tích + insight | **Một phần** | `user_behavior`, `student/stats`, `teacher/students/.../progress`, `personalized-path/suggest`, `rag/search`, assessment agents trong `lib` — **CẦN XÁC NHẬN** định nghĩa insight sản phẩm (dashboard riêng vs tích hợp trang học sinh). |
| GV + AI đề xuất lộ trình/lịch | **Một phần** | Luồng duyệt/sửa `personalized_paths`, feedback học sinh, `study_schedule` — **CẦN XÁC NHẬN** có cần lưu lịch sử đề xuất AI hay giữ prompt nội bộ. |
| **Admin** | **Có trong code, không có trong yêu cầu SP mới** | **CẦN XÁC NHẬN** có giữ role admin vận hành (báo cáo, user, sync) hay thu hẹp. |

---

## 2. Ma trận route chính

### 2.1. Student

| Vùng | Route ví dụ | Gần yêu cầu 4 mục |
|------|---------------|-------------------|
| Hub | `/student`, `/dashboard` → redirect | Trung gian điều hướng |
| Khóa học | `/student/courses`, explore, `[courseId]`, `learn/[lessonId]` | Khớp “Khóa học” |
| Lộ trình CH | `/personalized-roadmap`, `/roadmaps`, `/roadmaps/[id]` | **CẦN XÁC NHẬN** `/roadmaps` (công khai) có thuộc “Lộ trình cá nhân hóa” hay tách |
| Lịch | `/study-schedule` | Khớp “Lịch học thông minh” |
| Profile | `/profile` | Khớp |
| Ngoài 4 mục | `/quizzes`, `/assessment`, `/career`, `/student/teachers`, `/student/connections` | Lệch yêu cầu dashboard tối thiểu — **CẦN XÁC NHẬN** |

### 2.2. Teacher

| Vùng | Route ví dụ | Gần yêu cầu |
|------|---------------|-------------|
| Tổng quan | `/teacher` | Insight tổng quan (stats) — một phần |
| Khóa học | `/teacher/courses`, `new-v2`, `[id]/edit-v2`, `curriculum`, `lessons` | Khớp tạo/sửa khóa học |
| Học sinh & tiến độ | `/teacher/students`, `[studentId]` | Khớp dữ liệu phân tích |
| Lộ trình cá nhân | `/teacher/personalized-paths`, `[studentId]` | Khớp đề xuất/chỉnh lộ trình |
| AI roadmap | `/teacher/ai-roadmaps` | **CẦN XÁC NHẬN** có nằm trong phạm vi “cùng AI đề xuất” hay gộp |
| Roadmap công khai | `/teacher/roadmaps` | **CẦN XÁC NHẬN** |
| Kết nối | `/teacher/connections` | **CẦN XÁC NHẬN** (không nêu trong SP mới) |
| Thông báo | `/teacher/notifications` | Hỗ trợ vận hành — **CẦN XÁC NHẬN** |

### 2.3. Admin

| Vùng | Route ví dụ |
|------|-------------|
| Shell mới | `/(dashboard)/admin`, `courses`, `reports`, `user-courses`, … |
| Shell cũ | `/admin/topics`, `/admin/users`, lessons/exercises |

**CẦN XÁC NHẬN** phạm vi admin sau rework.

---

## 3. API theo mục tiêu sản phẩm (không liệt kê đủ 101 endpoint)

| Mục tiêu | API / subsystem |
|----------|-----------------|
| Khóa học | `courses*`, `user/courses*`, `course-lessons*`, `v2/*` (song song) |
| Lộ trình CH | `personalized-path/*`, có thể `ai/generate-roadmap`, `user/generate-learning-path` (legacy) |
| Lịch | `study-schedule*`, `user/study-schedule/by-lesson`, edge deadlines |
| Hành vi / phân tích | `user/activity`, `user_behavior`, `student/stats`, `teacher/students/*/progress` |
| Trắc nghiệm (nếu vẫn cần cho CH) | `assessment/*` — **CẦN XÁC NHẬN** có bắt buộc hay không |

---

## 4. Kết luận ngắn

Repo **đã có** hầu hết building blocks cho 4 mục học sinh và luồng giáo viên + AI, nhưng UI và domain đang **rộng hơn** yêu cầu tối thiểu. Rework nên **chuẩn hóa điều hướng và đặt tên** theo 4 pillar, **không thêm tính năng ngoài phạm vi** đã thống nhất.

---

*Tài liệu tham chiếu; không đổi mã nguồn.*
