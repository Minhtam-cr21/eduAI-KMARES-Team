-- Phase 3 assessment: structured learner profile + AI analysis (additive only)

ALTER TABLE public.career_orientations
  ADD COLUMN IF NOT EXISTS learner_profile JSONB,
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
  ADD COLUMN IF NOT EXISTS analysis_source TEXT,
  ADD COLUMN IF NOT EXISTS assessment_version TEXT;

COMMENT ON COLUMN public.career_orientations.learner_profile IS
  'Structured learner profile derived from deterministic assessment scoring.';

COMMENT ON COLUMN public.career_orientations.ai_analysis IS
  'Structured server-side analysis JSON. May be OpenAI-enriched or rule-based fallback.';

COMMENT ON COLUMN public.career_orientations.analysis_source IS
  'Source of the persisted analysis payload: openai or rule_based.';

COMMENT ON COLUMN public.career_orientations.assessment_version IS
  'Assessment pipeline version used to compute learner_profile and ai_analysis.';
