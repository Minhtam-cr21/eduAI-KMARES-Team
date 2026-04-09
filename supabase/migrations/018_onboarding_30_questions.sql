-- Bước 7b: Onboarding 30 câu + cột profiles bổ sung.

CREATE TABLE IF NOT EXISTS public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_answers_user_id_idx ON public.onboarding_answers(user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_style TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_pace TEXT
  CHECK (preferred_pace IS NULL OR preferred_pace IN ('slow', 'medium', 'fast'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS challenge_level TEXT
  CHECK (challenge_level IS NULL OR challenge_level IN ('easy', 'medium', 'hard'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_method TEXT
  CHECK (reminder_method IS NULL OR reminder_method IN ('email', 'telegram', 'none', 'in-app'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding answers" ON public.onboarding_answers;
CREATE POLICY "Users can view own onboarding answers" ON public.onboarding_answers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding answers" ON public.onboarding_answers;
CREATE POLICY "Users can insert own onboarding answers" ON public.onboarding_answers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own onboarding answers" ON public.onboarding_answers;
CREATE POLICY "Users can delete own onboarding answers" ON public.onboarding_answers
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.onboarding_answers IS 'Câu trả lời onboarding 30 câu (Bước 7b).';

-- Học sinh đã có goal/hours từ onboarding cũ → coi như đã hoàn tất.
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE role = 'student'
  AND goal IS NOT NULL
  AND hours_per_day IS NOT NULL
  AND (onboarding_completed IS NULL OR onboarding_completed = FALSE);
