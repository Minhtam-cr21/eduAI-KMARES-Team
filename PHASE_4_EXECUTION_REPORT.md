# Phase 4 Execution Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 4  
**Scope guard:** Refactor personalized path input sang structured assessment first, bổ sung schedule analysis foundation deterministic, giữ compatibility với flow path + study schedule hiện có, không mở rộng sang full calendar app hoặc merge learning schema.

## Mục tiêu phase

- Biến `learner_profile` và `ai_analysis` thành input chính cho personalized path suggestion.
- Giữ `assessment_responses` chỉ là fallback input.
- Bổ sung lớp phân tích deterministic cho `study_schedule` để student và teacher có summary/snapshot ổn định hơn.
- Giữ compatibility với API và UI hiện tại.
- Đảm bảo repo vẫn build pass.

## File đã sửa

- `lib/assessment/path-generator.ts`
- `lib/personalized-path/contracts.ts`
- `app/api/personalized-path/suggest/route.ts`
- `components/teacher/personalized-path-editor-client.tsx`
- `lib/study-schedule/analysis.ts`
- `app/api/study-schedule/route.ts`
- `app/api/teacher/students/[id]/schedule/route.ts`
- `app/(student)/study-schedule/page.tsx`
- `FINAL_REWORK_AUDIT.md`
- `PHASE_4_PATH_AND_SCHEDULE_DESIGN.md`
- `PHASE_4_EXECUTION_REPORT.md`

## Quyết định kỹ thuật

- `learner_profile` là primary input mới cho path suggestion.
- `ai_analysis` được dùng như structured enrichment đã persist từ Phase 3; Phase 4 không thêm client-side OpenAI call và không cần model call mới để path suggestion hoạt động.
- `assessment_responses` chỉ được đọc khi `learner_profile` không tồn tại hoặc parse fail.
- Path ordering chuyển về deterministic/rule-based theo:
  - profile goal
  - learner profile signals
  - ai analysis focus
  - published course catalog
  - `career_orientations.suggested_courses`
- `study_schedule` analysis dùng helper chung, deterministic và additive.
- `estimated_hours_total` và `estimated_hours_pending` được trả `null` thay vì bịa số vì dữ liệu hiện tại chưa có nguồn thời lượng đủ chắc chắn.
- Không thêm migration ở Phase 4.

## API nào thêm / sửa

### Sửa additive

- `GET /api/personalized-path/suggest`
- `POST /api/personalized-path/suggest`

Giữ:
- `courseSequence`
- `reasoning`

Thêm:
- `learnerSignalsUsed`
- `analysisSource`

Compatibility:
- consumer cũ chỉ đọc `courseSequence` + `reasoning` vẫn chạy

- `GET /api/study-schedule`

Giữ:
- `items`

Thêm:
- `summary`
- `analysis`

Compatibility:
- page/client cũ chỉ đọc `items` vẫn không vỡ shape

- `GET /api/teacher/students/[id]/schedule`

Giữ:
- `student`
- `items`
- `summary`

Thêm:
- `analysis`
- `summary.frozen`
- `summary.estimated_hours_total`
- `summary.estimated_hours_pending`

Compatibility:
- `summary.total/pending/completed/overdue` vẫn tồn tại như cũ

## Migration nào thêm

- Không có migration mới trong Phase 4

Lý do:
- Phase này chỉ cần read-time analysis và contract additive
- chưa cần snapshot persistence mới ở DB

## Những gì đã hoàn thành

- Refactor `generatePathFromAssessment(...)` để đọc:
  - `career_orientations.learner_profile`
  - `career_orientations.ai_analysis`
  - `profiles.goal`
  - published `courses`
- Giữ fallback về `assessment_responses` khi structured profile chưa sẵn sàng.
- Tạo contract rõ ràng cho path suggestion output ở `lib/personalized-path/contracts.ts`.
- Mở rộng `suggest` API theo kiểu additive.
- Hiển thị nhẹ source/signals của path suggestion trong teacher personalized path editor.
- Tạo helper `lib/study-schedule/analysis.ts` để dùng chung cho student và teacher schedule APIs.
- Mở rộng `GET /api/study-schedule` và `GET /api/teacher/students/[id]/schedule` với summary/analysis deterministic.
- Mở rộng nhẹ `app/(student)/study-schedule/page.tsx` để hiển thị summary, recommendations, weekly load.
- Cập nhật `FINAL_REWORK_AUDIT.md` theo snapshot thực tế sau Phase 4.
- Tạo tài liệu thiết kế `PHASE_4_PATH_AND_SCHEDULE_DESIGN.md`.

## Kết quả build/check

- `ReadLints` trên các file vừa sửa: **không có linter errors**
- `npm run build`: **PASS**

Ghi chú:
- Build lần đầu fail ở `lib/study-schedule/analysis.ts` do TypeScript báo `item.due_date` có thể là `null`
- Đã sửa bằng guard tường minh trong `isOverdue(...)`
- Build lại sau fix: **PASS**

## Rủi ro còn lại

- Path suggestion hiện đã structured-first, nhưng catalog vẫn dựa trên stack `courses`; Phase 4 không thay đổi learning SOT split với `edu_*`.
- `analysisSource` của path suggestion phản ánh nguồn dữ liệu dùng để generate path, không phải approval state hay product-final path state.
- Schedule analysis hiện là read-time snapshot; chưa có persisted history/snapshot table cho teacher audit dài hạn.
- `estimated_hours_*` vẫn là `null`; nếu phase sau muốn dùng số giờ thật thì cần chốt nguồn duration ổn định trước.
- Student route vẫn lọc theo `personalized_paths.status in (active, paused)` còn teacher route giữ visibility theo RLS hiện tại; Phase 4 không đổi behavior này để tránh regression.

## CẦN XÁC NHẬN

- Product có muốn path suggestion output sau này persist thêm snapshot `learnerSignalsUsed` vào `personalized_paths` hay tiếp tục chỉ generate/read-time?
- Teacher schedule insight phase sau có cần dùng persisted snapshot/history, hay read-time summary/analysis hiện tại đã đủ cho review?
- Nếu phase sau cần estimated hours, nguồn chuẩn sẽ là `course_lessons`, `study_schedule`, hay một duration field mới?
