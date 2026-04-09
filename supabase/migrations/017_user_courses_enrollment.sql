-- Bước 7: Đăng ký khóa học + tiến độ bài học (user_courses, user_course_progress).
-- RLS dùng auth_is_admin() (đã có) để tránh đệ quy policy trên profiles.

CREATE TABLE IF NOT EXISTS public.user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS user_courses_user_id_idx ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS user_courses_course_id_idx ON public.user_courses(course_id);
CREATE INDEX IF NOT EXISTS user_course_progress_user_course_idx
  ON public.user_course_progress(user_id, course_id);

ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students select own user_courses" ON public.user_courses;
CREATE POLICY "Students select own user_courses" ON public.user_courses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students insert own user_courses" ON public.user_courses;
CREATE POLICY "Students insert own user_courses" ON public.user_courses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students update own user_courses" ON public.user_courses;
CREATE POLICY "Students update own user_courses" ON public.user_courses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins all user_courses" ON public.user_courses;
CREATE POLICY "Admins all user_courses" ON public.user_courses
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "Students select own user_course_progress" ON public.user_course_progress;
CREATE POLICY "Students select own user_course_progress" ON public.user_course_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students update own user_course_progress" ON public.user_course_progress;
CREATE POLICY "Students update own user_course_progress" ON public.user_course_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins all user_course_progress" ON public.user_course_progress;
CREATE POLICY "Admins all user_course_progress" ON public.user_course_progress
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

COMMENT ON TABLE public.user_courses IS 'Học sinh đăng ký khóa học (courses mới).';
COMMENT ON TABLE public.user_course_progress IS 'Tiến độ từng bài (course_lessons) sau khi admin đồng bộ.';
