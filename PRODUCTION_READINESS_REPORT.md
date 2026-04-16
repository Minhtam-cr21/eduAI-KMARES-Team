# Production Readiness Report

**Date:** 2026-04-16  
**Track:** Upgrade Track 5 - Production Hardening + Vercel Readiness

## 1. Mục tiêu phase

- chuẩn bị codebase để deploy ổn định hơn lên Vercel
- giảm rủi ro runtime do thiếu env hoặc fail mode mù
- audit các route quan trọng
- chốt tài liệu deploy / vận hành

## 2. Những gì đã audit

### Environment / runtime

Đã rà:

- `.env.example`
- `env.supabase.deploy.example`
- `middleware.ts`
- `lib/supabase/*`
- `lib/ai/openai-client.ts`
- `lib/email/send.ts`
- `supabase/functions/handle-missed-deadlines/index.ts`
- `.github/workflows/supabase-handle-missed-deadlines.yml`

### Route quan trọng

Đã audit các route:

- assessment
- personalized path
- study schedule
- teacher review

### Performance/read-heavy surfaces

Đã audit:

- `/teacher/students`
- `/teacher/students/[studentId]`
- `/teacher/schedule-insights`
- `/teacher/path-review`

## 3. Những gì đã sửa

### Runtime env hardening

Đã thêm helper:

- `lib/runtime/env.ts`

Mục tiêu:

- gom kiểm tra `NEXT_PUBLIC_SUPABASE_URL`
- gom kiểm tra `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- tạo lỗi chuẩn `runtime_env_missing`

### Supabase entry points

Đã cập nhật:

- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/browser.ts`
- `middleware.ts`
- `app/auth/callback/route.ts`

Kết quả:

- middleware không còn phụ thuộc hoàn toàn vào non-null assertion cho env Supabase
- auth callback fail rõ hơn khi env thiếu
- các Supabase clients dùng chung một nguồn config validation

### Critical API error clarity

Đã chuẩn hóa fail mode rõ hơn cho:

- `app/api/assessment/submit/route.ts`
- `app/api/assessment/result/route.ts`
- `app/api/study-schedule/route.ts`
- teacher-gated APIs thông qua `lib/auth/assert-teacher-api.ts`

Kết quả:

- khi thiếu runtime env Supabase, route trả `503`
- response kèm:
  - `code: runtime_env_missing`
  - `missingEnv`

### Performance improvements

Đã thêm helper:

- `lib/teacher/students.ts`

Đã dùng helper này để:

- bỏ internal fetch roundtrip ở `app/(dashboard)/teacher/students/page.tsx`
- reuse cho `app/api/teacher/students/route.ts`
- reuse cho `app/(dashboard)/teacher/schedule-insights/page.tsx`

### Perceived performance

Đã thêm:

- `app/(dashboard)/teacher/students/loading.tsx`
- `app/(dashboard)/teacher/students/[studentId]/loading.tsx`
- `app/(dashboard)/teacher/schedule-insights/loading.tsx`
- `app/(dashboard)/teacher/path-review/loading.tsx`

## 4. Kỳ vọng runtime sau hardening

### Có bằng chứng từ code

- thiếu `NEXT_PUBLIC_SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_ANON_KEY` sẽ fail rõ hơn ở các entry points quan trọng
- assessment / schedule / teacher review APIs có fail mode `503` rõ ràng hơn
- edge function `handle-missed-deadlines` đã có tài liệu secret và deploy workflow riêng
- email hiện là optional runtime capability:
  - thiếu `RESEND_API_KEY` không làm sập app web
  - nhưng email workflow sẽ bị skip

### Chưa có bằng chứng đầy đủ

- remote production env đã được set đúng
- OAuth callback trên domain production thật đã được kiểm thử
- Resend production domain đã verify
- cron production đã chạy ổn định trên live environment
- RLS live production đã được review sâu

## 5. Kết quả kiểm tra

- `ReadLints` trên các file đã sửa: không có lỗi
- `npm run build`: pass

## 6. Rủi ro còn lại

- hardening hiện chủ yếu xử lý fail mode do env/config và UX loading, chưa thay thế cho integration testing thật trên Vercel + Supabase live.
- `teacher_list_students_with_stats` vẫn giữ semantics roster cũ; đây không phải bug deploy nhưng vẫn là rủi ro product/runtime behavior.
- learning stack vẫn còn song song `courses` và `edu_*`, nên production hardening hiện chưa giải quyết architectural split dài hạn.
- email và cron là hai thành phần có tài liệu rõ hơn sau phase này, nhưng vẫn cần verification thực tế ở môi trường deploy.

## 7. Không claim trong report này

Report này **không** claim:

- full production-ready
- remote/live runtime fully validated
- observability đầy đủ
- complete RLS/security review trên production

Track 5 này nên được hiểu là:

- `Vercel readiness improved`
- `runtime clarity improved`
- `deploy checklist documented`

không phải bằng chứng rằng toàn bộ hệ thống đã hardened hoàn toàn.

## 8. File đã sửa

- `lib/runtime/env.ts`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/browser.ts`
- `middleware.ts`
- `app/auth/callback/route.ts`
- `lib/auth/assert-teacher-api.ts`
- `app/api/assessment/submit/route.ts`
- `app/api/assessment/result/route.ts`
- `app/api/study-schedule/route.ts`
- `lib/teacher/students.ts`
- `app/api/teacher/students/route.ts`
- `app/(dashboard)/teacher/students/page.tsx`
- `app/(dashboard)/teacher/schedule-insights/page.tsx`
- `app/(dashboard)/teacher/students/loading.tsx`
- `app/(dashboard)/teacher/students/[studentId]/loading.tsx`
- `app/(dashboard)/teacher/schedule-insights/loading.tsx`
- `app/(dashboard)/teacher/path-review/loading.tsx`
- `VERCEL_DEPLOY_CHECKLIST.md`

## 9. CẦN XÁC NHẬN

- Team có muốn bước tiếp theo là smoke-test thật trên Vercel preview + Supabase live thay vì chỉ local build verification?
- Cron chính cho `handle-missed-deadlines` sẽ dùng GitHub Actions hay Supabase Schedules?
- Có muốn phase sau thêm một health-check/runbook hẹp cho env + external services không?
