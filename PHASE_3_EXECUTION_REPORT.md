# Phase 3 Execution Report

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 3  
**Scope guard:** Implement assessment + learner profile + server-side AI analysis pipeline additively, without schema destruction or product expansion sang personalized path full flow.

## Mục tiêu phase

- Thiết kế và implement lớp assessment mới rõ ràng hơn.
- Chuẩn hóa source câu hỏi 20 MBTI + 30 mở rộng.
- Tạo `learner_profile` có cấu trúc.
- Tạo pipeline AI server-side với fallback deterministic/rule-based.
- Giữ compatibility cho flow assessment cũ và các consumer đang dùng `assessment_completed` / `career_orientations`.

## File đã sửa

- `lib/assessment/contracts.ts`
- `lib/assessment/learner-profile.ts`
- `lib/assessment/ai-analysis.ts`
- `lib/assessment/questions.ts`
- `lib/assessment/load-result.ts`
- `app/api/assessment/submit/route.ts`
- `app/api/assessment/status/route.ts`
- `app/api/assessment/reset/route.ts`
- `app/(student)/assessment/page.tsx`
- `app/(student)/assessment/result/page.tsx`
- `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`
- `PHASE_3_ASSESSMENT_DESIGN.md`
- `PHASE_3_EXECUTION_REPORT.md`

## Quyết định kỹ thuật

- Giữ compatibility cho `lib/assessment/questions.ts`; không phá export cũ.
- Không tạo table mới; dùng additive columns trên `career_orientations` theo constraint mentor.
- Deterministic MBTI scoring vẫn là baseline bắt buộc.
- AI chỉ là lớp enrichment.
- Nếu OpenAI fail hoặc thiếu key, fallback vẫn trả `ai_analysis` hợp lệ với `analysis_source = "rule_based"`.
- Result page chỉ mở rộng thêm phần learner profile + analysis source, không redesign lớn.

## Migration nào đã thêm

- `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`

Nội dung chính:
- thêm `learner_profile jsonb`
- thêm `ai_analysis jsonb`
- thêm `analysis_source text`
- thêm `assessment_version text`

Ghi chú:
- Supabase CLI không có sẵn trong môi trường hiện tại, nên migration file được thêm thủ công theo naming additive.

## API nào đã thêm/sửa

### Sửa

- `POST /api/assessment/submit`
  - vẫn validate 50 câu như cũ
  - vẫn ghi legacy outputs như cũ
  - thêm build `learner_profile`
  - thêm AI enrichment server-side
  - lưu structured outputs vào `career_orientations`

- `GET /api/assessment/result`
  - trả thêm:
    - `learner_profile`
    - `ai_analysis`
    - `analysis_source`
    - `assessment_version`
  - nếu record cũ chưa có JSON mới, route tự derive fallback từ raw answers

- `GET /api/assessment/status`
  - trả thêm:
    - `analysisSource`
    - `assessmentVersion`

- `POST /api/assessment/reset`
  - behavior cũ giữ nguyên
  - comment và semantics đã khóa rõ rằng row delete ở `career_orientations` cũng dọn sạch artifact Phase 3

## OpenAI integration

### Route nào gọi model

- `POST /api/assessment/submit`

### Input nào được gửi

- learner profile đã chuẩn hóa server-side:
  - `mbti_type`
  - `mbti_dimensions`
  - `trait_scores`
  - `learning_style_signals`
  - `motivation_signals`
  - `goal_summary`
  - `constraint_summary`
  - `interests`
  - `risk_flags`

### Output JSON shape

```ts
{
  assessment_version: "phase3_v1";
  learner_summary: string;
  recommended_pacing: "slow" | "steady" | "accelerated";
  support_strategies: string[];
  motivation_hooks: string[];
  risk_explanation: string[];
  path_focus: string[];
  communication_style: string;
}
```

### Fallback hoạt động ra sao

- Nếu không có `OPENAI_API_KEY`, hoặc request fail, hoặc JSON parse fail, hoặc zod validation fail:
  - không crash route
  - dùng `buildFallbackLearnerAnalysis(...)`
  - lưu `analysis_source = "rule_based"`
  - learner profile vẫn hợp lệ và đầy đủ

## Kết quả build/check

- `ReadLints`: không có lỗi trên các file vừa sửa
- `npm run build`: **PASS**

## Rủi ro còn lại

- `career_orientations` hiện vẫn là nơi lưu cả legacy result lẫn structured result; nếu phase sau muốn audit/history sâu hơn có thể cần bảng riêng, nhưng phase này chưa cần.
- Teacher read policy hiện có trên `career_orientations` đồng nghĩa structured AI analysis cũng theo cùng visibility rule hiện tại.
- Result page hiện vẫn còn payload legacy song song với structured profile; phase sau cần chốt field nào mới là primary source cho personalized path input.
- Bộ câu hỏi vẫn nằm trong `lib/assessment/questions.ts`; đã được chuẩn hóa bằng export adapter nhưng chưa tách file question bank riêng.

## CẦN XÁC NHẬN

- Có muốn phase sau persist thêm lịch sử nhiều lần assessment thay vì overwrite current orientation row không?
- Có cần siết visibility của `ai_analysis` so với teacher read policy hiện tại trên `career_orientations` không?
- Personalized path phase sau sẽ đọc trực tiếp từ `learner_profile` hay cần thêm một contract API riêng cho learner profile snapshot?
