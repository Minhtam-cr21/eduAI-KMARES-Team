-- Refactor: drop legacy practice tables; add quizzes, quiz_attempts, user_behavior; extend study_schedule and profiles.
-- Numbered 029 because 027_fix_practice_exercises_rls.sql and 028_practice_solution_code.sql already exist.

DROP TABLE IF EXISTS public.practice_submissions CASCADE;
DROP TABLE IF EXISTS public.practice_exercises CASCADE;
DROP TABLE IF EXISTS public.practice_questions CASCADE;

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  time_limit INT,
  passing_score INT DEFAULT 70,
  created_by UUID REFERENCES public.profiles(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT,
  answers JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_id_idx ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_id_idx ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS user_behavior_user_id_idx ON public.user_behavior(user_id);
CREATE INDEX IF NOT EXISTS quizzes_course_id_idx ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS quizzes_lesson_id_idx ON public.quizzes(lesson_id);

ALTER TABLE public.study_schedule
  ADD COLUMN IF NOT EXISTS student_note TEXT;
ALTER TABLE public.study_schedule
  ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_learning_time INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login DATE;

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior ENABLE ROW LEVEL SECURITY;

-- quizzes: students read published rows; teachers/admins full CRUD (MVP).
DROP POLICY IF EXISTS "quizzes_select_published_or_staff" ON public.quizzes;
CREATE POLICY "quizzes_select_published_or_staff" ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR public.auth_is_teacher_or_admin()
  );

DROP POLICY IF EXISTS "quizzes_insert_teacher_admin" ON public.quizzes;
CREATE POLICY "quizzes_insert_teacher_admin" ON public.quizzes
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "quizzes_update_teacher_admin" ON public.quizzes;
CREATE POLICY "quizzes_update_teacher_admin" ON public.quizzes
  FOR UPDATE TO authenticated
  USING (public.auth_is_teacher_or_admin())
  WITH CHECK (public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "quizzes_delete_teacher_admin" ON public.quizzes;
CREATE POLICY "quizzes_delete_teacher_admin" ON public.quizzes
  FOR DELETE TO authenticated
  USING (public.auth_is_teacher_or_admin());

-- quiz_attempts: own rows; teachers/admins see all.
DROP POLICY IF EXISTS "quiz_attempts_select_own_or_staff" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select_own_or_staff" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "quiz_attempts_insert_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_insert_own" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quiz_attempts_update_own_or_staff" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_update_own_or_staff" ON public.quiz_attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.auth_is_teacher_or_admin())
  WITH CHECK (user_id = auth.uid() OR public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "quiz_attempts_delete_own_or_staff" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_delete_own_or_staff" ON public.quiz_attempts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.auth_is_teacher_or_admin());

-- user_behavior: insert own; select own or staff (analytics).
DROP POLICY IF EXISTS "user_behavior_select_own_or_staff" ON public.user_behavior;
CREATE POLICY "user_behavior_select_own_or_staff" ON public.user_behavior
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "user_behavior_insert_own" ON public.user_behavior;
CREATE POLICY "user_behavior_insert_own" ON public.user_behavior
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
