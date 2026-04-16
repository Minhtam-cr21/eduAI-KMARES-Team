# EduAI — API contracts (đích)

**Base URL (Next.js Route Handlers):** `/api/eduai/v1`  
**Auth:** Cookie session Supabase (giống hiện tại); mọi route kiểm tra `profiles.role` trong handler.  
**Format:** JSON; lỗi `{ "error": string, "code"?: string }`.

**Lưu ý:** Đây là **surface mới** song song các `/api/*` hiện có; cutover dần theo `MIGRATION_STRATEGY.md`.

---

## 1. Student dashboard

### `GET /api/eduai/v1/me/dashboard`

**Mô tả:** Một response tổng hợp cho 4 pillar (khóa học, path, lịch, tiến độ tóm tắt) + teaser profile.

**Response 200:** `StudentDashboardResponse` (`types/eduai-target-draft.ts`)

**Nguồn dữ liệu nội bộ:** `user_courses` join `courses`, `user_course_progress` aggregate, `personalized_paths` (`student_id = me`), `study_schedule` (upcoming window), optional `profiles`.

---

## 2. Teacher dashboard

### `GET /api/eduai/v1/teacher/dashboard`

**Quyền:** `teacher` | `admin`

**Response 200:** `TeacherDashboardResponse`

**Nguồn:** đếm khóa học của GV, học sinh gắn (từ path/connection/enrollment — **CẦN XÁC NHẬN** quy tắc), `personalized_paths` `pending`, `study_schedule` missed gần đây, `user_behavior` gần nhất.

---

## 3. Course management

### `GET /api/eduai/v1/courses`

Query: `scope=mine|published|all`, `page`, `page_size`  
**Response:** `{ items: CoursePublic[], total: number }`

### `POST /api/eduai/v1/courses`

Body: `CourseCreateBody`  
**Response201:** `CoursePublic`

### `GET /api/eduai/v1/courses/:courseId`

**Response:** `CourseDetailResponse`

### `PATCH /api/eduai/v1/courses/:courseId`

Body: `CourseUpdateBody`  
**Response:** `CoursePublic`

### `GET /api/eduai/v1/courses/:courseId/lessons`

**Response:** `{ lessons: CourseLessonPublic[] }`

### `POST /api/eduai/v1/courses/:courseId/lessons`

**Quyền:** owner teacher hoặc admin. Body: `{ title, content?, video_url?, order_index?, status? }` (**CẦN XÁC NHẬN** schema chi tiết).

---

## 4. Personalized path

### `GET /api/eduai/v1/me/personalized-path`

**Response 200:** `PersonalizedPathDto | null`

### `GET /api/eduai/v1/teacher/students/:studentId/personalized-path`

**Quyền:** teacher quản lý học sinh đó.

### `POST /api/eduai/v1/teacher/personalized-paths/suggest`

Body: `PathSuggestRequestBody`  
**Response:** `PathSuggestResponse` (AI; không tự ghi DB trừ khi có bước save riêng).

### `POST /api/eduai/v1/teacher/personalized-paths`

Body: tạo path draft: `{ student_id, course_sequence, teacher_feedback? }`

### `PATCH /api/eduai/v1/teacher/personalized-paths/:pathId`

Body: `PathApproveBody` hoặc đổi `status` (workflow hiện có: pending/approved/…).

### `POST /api/eduai/v1/me/personalized-paths/:pathId/feedback`

Body: `{ student_feedback: string }`

---

## 5. Smart schedule

### `GET /api/eduai/v1/me/schedule`

Query: `ScheduleListQuery` (`from`, `to`, `status`)  
**Response:** `{ items: ScheduleItemPublic[] }`

### `PATCH /api/eduai/v1/me/schedule/:scheduleId`

Body: `SchedulePatchBody` (`student_note`, `is_busy`)

### `POST /api/eduai/v1/me/schedule/:scheduleId/complete`

Body: `ScheduleCompleteBody` (optional `completed_at`)

**Ghi chú:** Giữ tương thích logic missed/frozen với edge `handle-missed-deadlines`; handler chỉ cập nhật DB, không đổi contract.

### `GET /api/eduai/v1/teacher/students/:studentId/schedule`

**Quyền:** teacher; cùng shape `ScheduleItemPublic[]` (có thể ẩn `student_note` nếu policy — **CẦN XÁC NHẬN**).

---

## 6. AI schedule insights

### `POST /api/eduai/v1/teacher/insights/schedule`

**Quyền:** teacher | admin  
Body: `AiScheduleInsightRequestBody`  
**Response:** `AiScheduleInsightResponse`

**Hành vi:** Đọc SOT `study_schedule`, `user_course_progress`, `user_behavior` (và tùy chọn assessment) → prompt LLM → trả JSON theo contract.

### `POST /api/eduai/v1/teacher/insights/schedule/persist` (optional)

Body: `AiScheduleInsightResponse` + `student_id`  
**Tác dụng:** ghi vào `teacher_insight_events` sau khi có bảng additive.

---

## 7. Student progress (resource rõ ràng)

### `GET /api/eduai/v1/me/progress`

**Response:** `StudentProgressResponse`

### `GET /api/eduai/v1/teacher/students/:studentId/progress`

**Response:** `StudentProgressResponse` + có thể kèm meta (tự động join quiz rollup).

---

## 8. Teacher insights bundle

### `GET /api/eduai/v1/teacher/students/:studentId/insights`

**Response:** `TeacherStudentInsightsResponse` (tổng hợp progress + schedule_health + behavior + quiz + optional nested AI).

---

## 9. Versioning & deprecation

- Header tùy chọn: `X-EduAI-Version: 1`
- Các route `/api/user/*`, `/api/study-schedule/*`, `/api/personalized-path/*` giữ cho tương thích cho đến khi client chuyển hết.

---

*Tài liệu contract; chưa implement.*
