# Upgrade Track 2 Report

**Date:** 2026-04-16  
**Track:** Smart Schedule V2 Engine  
**Result:** implemented with additive contracts, policy layer, minimal persistence, and build verification pending below.

## 1. Mục tiêu track

Nâng `study_schedule` từ rule-based nền thành Smart Schedule V2 mà vẫn giữ:

- `study_schedule` là source of truth
- teacher là người duyệt cuối
- compatibility cho `summary` / `analysis` hiện có

## 2. File đã sửa

- `lib/study-schedule/contracts.ts`
- `lib/study-schedule/analysis.ts`
- `lib/study-schedule/snapshot.ts`
- `lib/study-schedule/learner-context.ts`
- `lib/study-schedule/adjustment-log-store.ts`
- `app/api/study-schedule/route.ts`
- `app/api/teacher/students/[id]/schedule/route.ts`
- `lib/teacher/schedule-insight.ts`
- `lib/teacher/review-contracts.ts`
- `components/teacher/teacher-schedule-insights-client.tsx`
- `supabase/functions/handle-missed-deadlines/index.ts`
- `supabase/migrations/20260416020000_upgrade_track2_schedule_adjustment_logs.sql`
- `SMART_SCHEDULE_V2_SPEC.md`

## 3. Những gì đã hoàn thành

### Contracts mới

Đã thêm additive contracts cho:

- `SchedulePriority`
- `SoftDeadlineLevel`
- `WeeklyLearningAnalysis`
- `TeacherScheduleRecommendation`
- `ScheduleAdjustmentProposal`

### Priority model

Engine hiện tính priority từ:

- due date proximity
- `miss_count`
- overdue / frozen state
- weekly high-load / imbalance
- learner profile risk flags nếu có
- recommended pacing nếu có

Nếu không có learner context, engine fallback hoàn toàn sang rule-based.

### Soft deadline policy nhiều mức

Edge function `handle-missed-deadlines` đã được rà soát và nâng cấp:

- level 1: dời nhẹ, gần behavior `+1 day` cũ
- level 2: giảm tải tuần
- level 3: tái cân bằng thêm task sau
- level 4: freeze có kiểm soát + signal teacher review

### Weekly analysis nâng cấp

`analysis` mới có thêm:

- `engine_version`
- `weekly_analysis`
- `total_slip_count`
- `high_load_detected`
- `imbalance_detected`
- `recommended_pacing`
- `teacher_recommendations`
- `adjustment_proposals`

### Teacher recommendations

Đã thêm deterministic teacher recommendation cho:

- giữ nhịp
- giảm tải
- đổi ưu tiên
- cần can thiệp

Teacher review API cũng nhận thêm override tối thiểu:

- `overridePriority`
- `overridePacing`
- `overrideLevel`

Override hiện được log additive, không thay source of truth trực tiếp.

### Persistence tối thiểu

Đã thêm migration additive:

- `schedule_adjustment_logs`

Mục đích:

- decision log cho system policy
- compact teacher override log
- không copy full items

Ngoài ra `teacher_review_events` schedule snapshot đã được mở rộng additive để chứa compact V2 insight.

## 4. Compatibility được giữ như thế nào

- `study_schedule` vẫn là source of truth
- `teacher_review_events` vẫn là review/audit layer
- `summary` giữ nguyên fields cũ
- `analysis_source`, `as_of_date`, `weekly_load`, `recommendations` vẫn còn
- route cũ vẫn trả `items`, `summary`, `analysis`; chỉ thêm field mới
- UI hiện tại không cần redesign để tiếp tục hoạt động

## 5. Kiểm tra đã chạy

- `ReadLints` trên các file sửa chính: pass
- `npm run build`: pending at report drafting time, see final verification below

## 6. Rủi ro còn lại

- `schedule_adjustment_logs` là minimal persistence; chưa có full teacher-facing history UI riêng.
- Teacher override hiện mới được log additive; chưa có flow apply override trực tiếp vào `study_schedule` với approval semantics riêng.
- Edge function level 3 rebalance hiện intentionally conservative, chỉ dời một số pending item kế tiếp thay vì full replanning.
- Level 4 currently freeze theo guardrail 7 ngày; đây là policy choice cần team confirm.
- Build/runtime local pass vẫn không thay thế cho live Supabase validation.

## 7. CẦN XÁC NHẬN

- Team có chấp nhận `level_4` freeze 7 ngày như default policy phase này không?
- Teacher override có nên tiếp tục chỉ log additive ở Track 2, hay phase sau cần workflow apply override rõ hơn?
- `schedule_adjustment_logs` có nên là audit layer chuẩn cho future smart schedule phases không?
