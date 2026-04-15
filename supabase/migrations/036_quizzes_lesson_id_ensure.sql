-- Idempotent: lesson_id on quizzes already exists from migration029; safe if re-applied.
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS quizzes_lesson_id_idx ON public.quizzes(lesson_id);
