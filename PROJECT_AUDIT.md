# EduAI — Báo cáo audit kiến trúc (repo thực tế)

**Phạm vi:** Next.js (App Router), TypeScript, Supabase — workspace `EduAI-kmaresteam-cursor`.  
**Ngày tham chiếu:** 2026-04-16.  
**Căn cứ:** mã nguồn trong repo (`middleware.ts`, `types/database.ts`, `supabase/migrations/*.sql`, và **101** file `app/api/**/route.ts`).

**Lưu ý:** Không đọc nội dung file `.env*`. Mọi điểm chưa đối chiếu runtime/production được đánh dấu **CẦN XÁC NHẬN**.

---

## 1. Tóm tắt điều hành

| Chủ đề | Quan sát ngắn |
|--------|----------------|
| **Nhiều mô hình dữ liệu song song** | `topics` / `lessons` / `learning_paths` (MVP cũ), `courses` / `course_lessons` / `user_courses`, schema `edu_*` + `/api/v2/*`, `roadmaps` / `custom_roadmaps`, cá nhân hóa `personalized_paths` + `study_schedule`. |
| **Điều hướng theo role** | `/dashboard` là redirect phía client theo `profiles.role` tới `/student`, `/teacher`, hoặc `/admin` (`app/(student)/dashboard/page.tsx`). |
| **Bảo vệ route** | `middleware.ts`: session; `admin` cho `/admin` và `/api/admin/*`; `teacher` hoặc `admin` cho `/teacher/*` và hầu hết `/api/teacher/*`, **trừ** `/api/teacher/list` và `/api/teacher/public/*` (học sinh đã đăng nhập). |
| **Tự động lịch** | Edge Function `supabase/functions/handle-missed-deadlines` + workflow `.github/workflows/supabase-handle-missed-deadlines.yml`. |
| **So với yêu cầu sản phẩm mới** | Yêu cầu: dashboard học sinh **chỉ** Khóa học, Lộ trình cá nhân hóa, Lịch học thông minh, Profile. Repo hiện có thêm Quiz, trắc nghiệm, roadmap công khai, kết nối GV, career, v.v. → **CẦN XÁC NHẬN** (tách khỏi nav, gộp hub, hay loại khỏi phạm vi). |

---

## 2. Cây thư mục (mã nguồn chính; bỏ qua `.next/`, `node_modules/`)

```
EduAI-kmaresteam-cursor/
├── app/
│   ├── (auth)/login/, signup/
│   ├── (dashboard)/admin/
│   ├── (dashboard)/teacher/
│   ├── (student)/
│   ├── admin/                    # topics, users, lessons/exercises (UI legacy)
│   ├── api/
│   ├── auth/callback/
│   └── layout.tsx, page.tsx, globals.css, robots.ts, sitemap.ts
├── components/
│   ├── admin/, assessment/, auth/, calendar/, connection/, landing/, meeting/
│   └── student/, teacher/, theme/, ui/
├── lib/
│   ├── actions/ (auth, lessons, topics)
│   ├── admin/, ai/, ai-debugger/, assessment/, auth/, constants/, courses/
│   ├── edu-v2/, email/, i18n/, judge0/, meeting/, notifications/, rag/
│   ├── schedule/, seo/, server/, study-schedule/, supabase/, teacher/, user/, user-courses/
│   └── validations/
├── supabase/
│   ├── config.toml
│   ├── functions/handle-missed-deadlines/
│   └── migrations/ (001 … 040, 20250409*, 20250413*)
├── types/database.ts
├── scripts/
├── public/images/
├── middleware.ts
├── openai-test/
├── roadmaps/
└── package.json, tsconfig.json, tailwind.config.ts, …
```

**CẦN XÁC NHẬN:** Trong snapshot workspace có thư mục `.next/` (artifact build). Thông thường không đưa vào git và không dùng làm nguồn kiến trúc.

---

## 3. Phân loại: đang dùng / legacy / trùng logic / nên giữ khi rework

### 3.1. Đang dùng (active)

- **Auth:** `app/(auth/*)`, `app/auth/callback/route.ts`, `lib/actions/auth.ts`, `lib/supabase/*`, `components/auth/*`.
- **Học sinh:** `app/(student)/**`, `components/student/*`, lịch: `app/(student)/study-schedule`, `components/calendar/study-calendar.tsx`.
- **Giáo viên:** `app/(dashboard)/teacher/**`, `components/teacher/*`, `/api/teacher/*`.
- **Admin (tồn tại trong repo):** `app/(dashboard)/admin/**`, `app/admin/**`, `components/admin/*`, `/api/admin/*`.
- **Khóa học (model `courses`):** `/api/courses/*`, `/api/user/courses/*`, `/api/course-lessons/*`, `app/(student)/student/courses/**`.
- **Edu v2:** `/api/v2/*`, `lib/edu-v2/*`, migration `040_new_edu_ai_schema.sql`.
- **Cá nhân hóa và lịch:** `/api/personalized-path/*`, `/api/study-schedule/*`, `/api/user/study-schedule/*`.
- **Trắc nghiệm / career:** `/api/assessment/*`, `lib/assessment/*`, `app/(student)/assessment/**`, `app/(student)/career`.
- **Quiz:** `/api/courses/.../quiz/*`, bảng `quizzes`, `quiz_attempts`.
- **Edge + CI:** `handle-missed-deadlines`, workflow GitHub Actions.

### 3.2. Legacy / nửa legacy

- **`topics` / `lessons`:** `app/admin/topics/**`, `lib/actions/topics.ts`, `lessons.ts`; song song `courses`. **CẦN XÁC NHẬN** còn luồng `/learn/[lessonId]` hay chỉ giữ dữ liệu.
- **`learning_paths`:** `/api/user/learning-paths*`, `/api/user/generate-learning-path`; `.cursorrules` ghi API cũ cho dữ liệu cũ.
- **`onboarding_answers`:** migration có bảng; ghi chú nội bộ legacy UI — **CẦN XÁC NHẬN** còn đọc ở đâu.
- **`practice_exercises` / `practice_submissions`:** migration `20250409000000`; sau đó có quiz — **CẦN XÁC NHẬN** dữ liệu thực tế.
- **`mbti_results`:** song song `career_orientations` — **CẦN XÁC NHẬN** hợp nhất.
- **Hai vỏ admin:** `(dashboard)/admin` vs `app/admin`.

### 3.3. Trùng logic / song song

| Vùng | Biểu hiện |
|------|------------|
| Nội dung khóa học | `courses` + `course_lessons` vs `edu_*` vs `topics`/`lessons`. |
| Enrollment / progress | `user_courses` / `user_course_progress` vs `edu_enrollments` / `edu_student_progress`. |
| Lộ trình | `learning_paths` vs `personalized_paths` + `study_schedule` vs `roadmaps` / `custom_roadmaps`. |
| Lịch API | `/api/study-schedule/*` và `/api/user/study-schedule/by-lesson`. |
| Teacher builder | `new-v2`, `edit-v2`, `curriculum` vs màn hình quản lý cũ. |

### 3.4. Nên giữ khi rework (theo yêu cầu: không xóa code)

- Auth, Supabase clients, middleware, RLS đã đầu tư.
- API đang phục vụ học viên đang học (enroll, path, schedule).
- Edge function nếu production phụ thuộc cron.
- `types/database.ts` — cập nhật dần theo chuẩn hóa schema.

---

## 4. Domain chức năng (theo repo)

1. Identity và `profiles`  
2. Catalog và học bài (`courses`, quiz, nhánh `edu_*`)  
3. Trắc nghiệm và định hướng (`assessment_*`, `career_orientations`)  
4. Cá nhân hóa (`personalized_paths`, AI suggest/approve)  
5. Lịch học (`study_schedule`, edge job)  
6. Giáo viên: khóa học, roadmap, học sinh, thông báo  
7. Kết nối GV (`connection_requests`, meeting)  
8. Admin và báo cáo  
9. RAG / embeddings (`roadmap_embeddings`, `/api/rag/search`)  
10. Hành vi / quota (`user_behavior`, `user_quotas`)  
11. Legacy: `topics`/`lessons`/`learning_paths`

---

## 5. API hiện có

**101** route handlers. Nhóm chính:

- `admin/*` — courses, exercises, lessons, stats, sync-course, sync-learning-paths, user-courses, users, role  
- `ai/*` — generate-course, generate-roadmap, custom-roadmap submit  
- `assessment/*` — questions, reset, result, status, submit  
- `connection-requests/*` — CRUD, respond, generate-meeting, student/teacher variants  
- `course-categories`, `course-lessons*`, `courses*`, `exercises*`, `lessons/[id]`  
- `notifications/teacher`  
- `personalized-path/*` — suggest, teacher/student approve, feedback, cancel  
- `rag/search`  
- `reports*`, `roadmaps`  
- `student/stats`  
- `study-schedule*`  
- `teacher/*` — connection-requests, courses/from-ai, lessons, custom-roadmaps, list, public, roadmaps, stats, students, progress  
- `user/*` — activity, course-lessons, courses (enroll, enrolled, progress, lessons, complete), generate-learning-path, learning-paths, profile, study-schedule/by-lesson  
- `v2/*` — courses, modules, lessons, contents, progress, submissions, me/enrollments  
- `complete-lesson`, `test-key`

**CẦN XÁC NHẬN:** `.cursorrules` đề cập `/api/run-code`, `/api/ai-suggest` — không thấy trong `app/api` hiện tại (đổi tên hoặc đã gỡ).

---

## 6. Bảng dữ liệu (từ `CREATE TABLE` trong migrations)

`profiles`, `topics`, `lessons`, `learning_paths`, `code_submissions`, `user_quotas`, `exercises`, `practice_questions`, `onboarding_answers`, `user_courses`, `user_course_progress`, `courses`, `course_lessons`, `connection_requests`, `reports`, `mbti_results`, `practice_exercises`, `practice_submissions`, `assessment_responses`, `career_orientations`, `personalized_paths`, `study_schedule`, `notifications`, `roadmap_embeddings`, `custom_roadmaps`, `quizzes`, `quiz_attempts`, `user_behavior`, `roadmaps`, `course_categories`, `course_reviews`, `vouchers`, `course_benefits`, `course_chapters`, `edu_courses`, `edu_modules`, `edu_lessons`, `edu_lesson_contents`, `edu_resources`, `edu_enrollments`, `edu_student_progress`, `edu_submissions`.

**CẦN XÁC NHẬN:** Trạng thái đầy đủ (views, index, cột bổ sung sau migration) nên đối chiếu Supabase Dashboard hoặc db dump.

---

## 7. Role matrix (tóm tắt)

| Khả năng | Student | Teacher | Admin | Yêu cầu SP mới |
|----------|---------|---------|-------|----------------|
| Đăng nhập / đăng ký | Có | Có | Có | Giữ (học sinh) |
| Khóa học | Có | Tạo / sửa | Quản trị | Giữ |
| Lộ trình cá nhân hóa | Có | Có | Tùy RLS | Giữ |
| Lịch học thông minh | Có | Một phần — **CẦN XÁC NHẬN** | — | Giữ |
| Profile | Có | Có | Users | Giữ |
| AI / insight cho GV | Gián tiếp (dữ liệu) | Có (stats, path, RAG, …) | — | Giữ trong phạm vi mô tả |

Chi tiết: `FEATURE_MATRIX.md`.

---

## 8. Vấn đề kiến trúc hiện tại

1. Ba lớp nội dung (`topics`, `courses`, `edu_*`) làm tăng chi phí bảo trì và RLS.  
2. Hai không gian admin UI.  
3. Khái niệm “roadmap” trùng tên, khác bảng.  
4. `.cursorrules` có lịch sử mâu thuẫn (practice vs quiz) — cần một north star sản phẩm.  
5. Phụ thuộc cron edge: cần runbook vận hành.  
6. **CẦN XÁC NHẬN:** `.env*` trong repo là secret thật hay file mẫu; có nên gitignore triệt để hay không.

---

## 9. Kiến trúc đích

Xem `TARGET_ARCHITECTURE.md` và `MIGRATION_MAP.md`.

---

*Tài liệu mô tả trạng thái repo; bước audit này không đổi mã nguồn.*
