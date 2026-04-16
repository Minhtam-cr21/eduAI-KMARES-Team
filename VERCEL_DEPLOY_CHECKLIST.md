# Vercel Deploy Checklist

**Date:** 2026-04-16  
**Scope:** deploy checklist cho Next.js app trên Vercel, kèm các phụ thuộc Supabase / OpenAI / email / scheduled jobs.  
**Important:** tài liệu này không khẳng định hệ thống đã production-ready hoàn toàn; chỉ chốt những gì có thể xác minh từ codebase hiện tại.

## 1. Vercel project baseline

- Dùng Node.js tương thích với `package.json`:
  - `>= 18.18.0`
- Framework:
  - Next.js `14.2.28`
- Build command:
  - `npm run build`
- Start command cho local verification:
  - `npm run start`

## 2. Environment variables trên Vercel

### Bắt buộc cho app runtime

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Hai biến này hiện là bắt buộc cho:

- middleware auth gating
- Supabase browser client
- Supabase server client
- auth callback
- assessment / schedule / teacher APIs

Nếu thiếu, các route đã được harden để trả lỗi `503` với code:

- `runtime_env_missing`

### Bắt buộc nếu dùng canonical public origin

- `NEXT_PUBLIC_APP_URL`

Nên set trên Vercel production domain để ổn định:

- metadata / sitemap / robots
- email links
- OAuth / callback related public URLs

Fallback hiện có:

- nếu thiếu `NEXT_PUBLIC_APP_URL`, code sẽ dùng `VERCEL_URL`
- nếu cả hai thiếu trong local/dev, fallback về `http://localhost:3000`

### Tùy chọn cho AI server-side

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_COURSE_OUTLINE_MODEL`
- `OPENAI_COURSE_CONTEXT_MODEL`
- `OPENAI_COURSE_USE_GPT4O`
- `AI_PROVIDER_ORDER`

Lưu ý:

- `OPENAI_API_KEY` không được đưa vào `NEXT_PUBLIC_*`
- assessment structured layer hiện có fallback rule-based khi AI enrichment không khả dụng
- một số AI/course generation routes vẫn phụ thuộc key để chạy đầy đủ

### Tùy chọn cho email

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Trạng thái hiện tại:

- nếu thiếu `RESEND_API_KEY`, app server sẽ log warning và bỏ qua send mail
- điều này không làm app web chết runtime, nhưng sẽ làm email workflow không hoạt động

## 3. Secrets không thuộc Vercel app runtime

### Supabase service-role usage

Không đưa vào public client. Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- hoặc `SUPABASE_SERVICE_ROLE_JWT_KEY`

Dùng cho:

- scripts
- privileged server tasks
- sync / migrate helpers

### Supabase Edge Function `handle-missed-deadlines`

Secret cần ở Supabase Edge Functions secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional)

Supabase inject sẵn:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### GitHub Actions secrets cho cron workflow

Workflow:

- `.github/workflows/supabase-handle-missed-deadlines.yml`

Secrets cần:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN` chỉ khi deploy function từ GitHub Actions

## 4. Route/runtime expectations

### Assessment

Routes đã audit:

- `app/api/assessment/submit/route.ts`
- `app/api/assessment/result/route.ts`

Expected:

- `401` khi chưa đăng nhập
- `400` khi body/input không hợp lệ
- `503` khi thiếu runtime env Supabase hoặc schema sync chưa đủ
- `500` cho DB/runtime failures khác

### Personalized path

Route đã audit:

- `app/api/personalized-path/suggest/route.ts`

Expected:

- `401/403` qua teacher gate
- `400` khi `studentId` không hợp lệ
- `503` nếu runtime env thiếu hoặc schema dependency chưa sync
- `500` cho lỗi suggest/runtime khác

### Study schedule

Route đã audit:

- `app/api/study-schedule/route.ts`

Expected:

- `401` khi chưa đăng nhập
- `503` khi thiếu runtime env Supabase
- `500` khi query / enrichment / snapshot fail

### Teacher review

Route đã audit:

- `app/api/teacher/students/[id]/schedule/route.ts`

Expected:

- `401/403` qua teacher gate
- `400` khi payload review không hợp lệ
- `503` khi thiếu runtime env hoặc thiếu schema dependency
- `500` cho review insert / log insert failures khác

## 5. Performance/read-heavy checks

Đã làm trong phase này:

- bỏ internal HTTP hop ở `/teacher/students` bằng cách load trực tiếp từ Supabase helper
- gom helper danh sách học sinh teacher vào `lib/teacher/students.ts`
- thêm `loading.tsx` cho:
  - `/teacher/students`
  - `/teacher/students/[studentId]`
  - `/teacher/schedule-insights`
  - `/teacher/path-review`

## 6. Deploy sequence khuyến nghị

1. Set toàn bộ env bắt buộc trên Vercel.
2. Xác minh domain/public URL:
   - `NEXT_PUBLIC_APP_URL`
3. Chạy `npm run build` local hoặc preview build.
4. Deploy app lên Vercel.
5. Xác minh login + auth callback.
6. Xác minh assessment result.
7. Xác minh personalized path suggest.
8. Xác minh study schedule student.
9. Xác minh teacher review schedule flow.
10. Deploy hoặc xác minh riêng Supabase Edge Function `handle-missed-deadlines`.
11. Xác minh GitHub Actions cron nếu đang dùng workflow đó.

## 7. Post-deploy smoke test

- Login / signup hoạt động
- `/assessment` submit và `/assessment/result` đọc được dữ liệu
- `/personalized-roadmap` và teacher path suggest chạy không lỗi
- `/study-schedule` render được snapshot
- `/teacher/students/[studentId]` và `/teacher/schedule-insights` mở được
- Email workflow:
  - có log warning nếu thiếu `RESEND_API_KEY`
  - có gửi mail thực nếu đã cấu hình Resend đúng

## 8. Không nên claim lúc này

Không nên claim các ý sau nếu chưa có bằng chứng runtime/live riêng:

- production-ready fully
- remote RLS reviewed completely
- edge cron production verified
- email domain verified
- preview/production OAuth callback fully validated trên domain thật

## 9. CẦN XÁC NHẬN

- Team có muốn dùng GitHub Actions làm cron chính, hay chuyển hẳn sang Supabase Cron/Schedules?
- `NEXT_PUBLIC_APP_URL` canonical production domain đã được chốt chưa?
- Resend có domain gửi mail đã verify cho production chưa?
