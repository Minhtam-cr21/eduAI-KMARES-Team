# Phase 3 Assessment Design

**Date:** 2026-04-16  
**Phase:** Master Plan V2 - Phase 3  
**Scope:** Assessment mới cho learner profile + AI analysis pipeline server-side, additive và compatible với flow assessment hiện tại.

## 1. Luồng assessment mới

1. Học sinh vào `/assessment`.
2. UI tải bộ câu hỏi từ `GET /api/assessment/questions`.
3. Bộ câu hỏi dùng một source thống nhất trong `lib/assessment/questions.ts`, nhưng vẫn giữ compatibility cho import cũ.
4. Khi submit tới `POST /api/assessment/submit`, server thực hiện:
   - validate đầy đủ 50 câu,
   - chấm deterministic cho MBTI,
   - tính trait scores,
   - build `learner_profile` có cấu trúc,
   - gọi AI server-side để enrich nếu có `OPENAI_API_KEY`,
   - nếu AI fail hoặc thiếu key thì dùng fallback rule-based,
   - lưu raw answers + legacy fields + structured fields.
5. `GET /api/assessment/result` trả về:
   - payload cũ cho compatibility,
   - `learner_profile`,
   - `ai_analysis`,
   - `analysis_source`,
   - `assessment_version`.

## 2. Nguồn câu hỏi

Source chính vẫn nằm ở:
- `lib/assessment/questions.ts`

Compatibility được giữ bằng cách:
- không xóa export cũ:
  - `ASSESSMENT_QUESTIONS`
  - `ASSESSMENT_QUESTION_CODES`
  - `ASSESSMENT_QUESTIONS_BY_GROUP`
- chỉ bổ sung thêm export adapter:
  - `MBTI_ASSESSMENT_QUESTIONS`
  - `EXTENDED_ASSESSMENT_QUESTIONS`
  - `ASSESSMENT_QUESTION_COUNTS`
  - `ASSESSMENT_QUESTION_MAP`
  - helper cho option label / grouping

Phân tách hiện tại:
- **20 câu MBTI:** `MBTI_1` → `MBTI_20`
- **30 câu mở rộng:** `A1` → `D8`

Mục tiêu của source câu hỏi mới:
- UI test dễ dùng
- scoring deterministic dễ dùng
- AI context builder dùng lại được

## 3. Scoring deterministic

### 3.1 MBTI

Baseline deterministic bắt buộc:
- `computeMBTI(answers)` giữ vai trò xác định `mbti_type`
- `computeMbtiDimensions(answers)` bổ sung breakdown theo 4 cặp:
  - `EI`
  - `SN`
  - `TF`
  - `JP`

Output dimensions gồm:
- `primary`
- `secondary`
- `counts`
- `confidence`

### 3.2 Trait scores

Trait scores vẫn được tính deterministic từ bộ câu hỏi mở rộng:
- `motivation`
- `learningStyle`
- `foundationSkills`
- `interests`

Đây là baseline để:
- build learner profile
- fallback analysis
- giữ cho app hoạt động khi OpenAI unavailable

## 4. Learner profile structure

File contract chính:
- `lib/assessment/contracts.ts`

`learner_profile` được khóa bằng zod schema và có shape:

```ts
type LearnerProfile = {
  assessment_version: "phase3_v1";
  mbti_type: string;
  mbti_dimensions: {
    EI: AxisDimension;
    SN: AxisDimension;
    TF: AxisDimension;
    JP: AxisDimension;
  };
  trait_scores: {
    motivation: number;
    learningStyle: number;
    foundationSkills: number;
    interests: number;
  };
  learning_style_signals: string[];
  motivation_signals: string[];
  goal_summary: string;
  constraint_summary: string;
  interests: string[];
  risk_flags: string[];
};
```

Learner profile được build deterministic trong:
- `lib/assessment/learner-profile.ts`

## 5. AI analysis flow

### 5.1 Route gọi model

Route hiện gọi pipeline AI assessment:
- `POST /api/assessment/submit`

OpenAI chỉ được gọi server-side qua:
- `lib/assessment/ai-analysis.ts`
- `lib/ai/openai-client.ts`

### 5.2 Input gửi lên model

Input gửi model là **learner profile đã chuẩn hóa**, không gửi free-form raw text từ client.

Input shape:

```json
{
  "learner_profile": {
    "assessment_version": "phase3_v1",
    "mbti_type": "INTJ",
    "mbti_dimensions": { "...": "..." },
    "trait_scores": {
      "motivation": 72,
      "learningStyle": 68,
      "foundationSkills": 44,
      "interests": 81
    },
    "learning_style_signals": ["..."],
    "motivation_signals": ["..."],
    "goal_summary": "...",
    "constraint_summary": "...",
    "interests": ["..."],
    "risk_flags": ["..."]
  }
}
```

### 5.3 Output JSON shape

AI output bị khóa bằng zod schema strict:

```ts
type LearnerAnalysis = {
  assessment_version: "phase3_v1";
  learner_summary: string;
  recommended_pacing: "slow" | "steady" | "accelerated";
  support_strategies: string[];
  motivation_hooks: string[];
  risk_explanation: string[];
  path_focus: string[];
  communication_style: string;
};
```

Không dùng free-form model text làm source of truth.

## 6. Persistence

### 6.1 Bảng/cột dùng để lưu

Persistence mặc định dùng additive columns trên `career_orientations`:
- `learner_profile jsonb`
- `ai_analysis jsonb`
- `analysis_source text`
- `assessment_version text`

Migration additive:
- `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`

### 6.2 Compatibility với flow cũ

Submit route vẫn tiếp tục ghi:
- `assessment_responses`
- `career_orientations.mbti_type`
- `career_orientations.strengths`
- `career_orientations.weaknesses`
- `career_orientations.suggested_careers`
- `career_orientations.suggested_courses`
- `profiles.mbti_type`
- `profiles.career_orientation`
- `profiles.assessment_completed`
- `profiles.assessment_completed_at`

Nhờ đó:
- consumer cũ vẫn chạy
- Phase 3 chỉ thêm structured layer

## 7. Fallback strategy nếu OpenAI unavailable

Fallback bắt buộc hoạt động trong các trường hợp:
- thiếu `OPENAI_API_KEY`
- OpenAI request fail
- JSON parse fail
- zod validation fail

Khi fallback xảy ra:
- `learner_profile` vẫn được build deterministic
- `ai_analysis` được build bằng rule-based fallback
- `analysis_source = "rule_based"`

Không để app hỏng hoặc trả payload rỗng.

## 8. Reset behavior

Route:
- `POST /api/assessment/reset`

Vì route hiện xóa toàn bộ row trong `career_orientations`, nên các cột additive Phase 3 cũng được xóa cùng lúc:
- `learner_profile`
- `ai_analysis`
- `analysis_source`
- `assessment_version`

Compatibility với flow cũ vẫn giữ nguyên vì route vẫn reset:
- `assessment_completed`
- `assessment_completed_at`
- `career_orientation`
- `mbti_type`

## 9. Ghi chú cho phase sau

- `learner_profile` là input structured cho personalized path phase sau.
- AI analysis hiện chỉ enrich assessment domain, chưa được dùng để generate path đầy đủ.
- Không có merge schema lớn giữa learning stacks trong phase này.
