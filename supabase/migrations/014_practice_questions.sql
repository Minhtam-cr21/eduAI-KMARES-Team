-- Bảng câu hỏi luyện tập ("Phòng luyện code"), không liên quan exercises.

CREATE TABLE IF NOT EXISTS public.practice_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'python',
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  initial_code TEXT DEFAULT '',
  sample_input TEXT DEFAULT '',
  sample_output TEXT DEFAULT '',
  hint TEXT DEFAULT '',
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS practice_questions_lang_pub
  ON public.practice_questions(language, is_published);

ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published practice questions"
  ON public.practice_questions
  FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Admins full access practice questions"
  ON public.practice_questions
  FOR ALL
  TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());
