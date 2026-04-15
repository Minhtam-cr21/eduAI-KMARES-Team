-- Edu-AI V2: Course -> Module -> Lesson -> LessonContent (+ Resource, Progress, Submission, Enrollment)
-- Legacy tables (courses, course_lessons, ...) are NOT dropped.

CREATE TABLE IF NOT EXISTS public.edu_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  language TEXT DEFAULT 'vi',
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  category TEXT,
  thumbnail_url TEXT,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_hours INT DEFAULT 0,
  total_lessons INT DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.edu_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  duration_hours INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edu_modules_course_id_idx ON public.edu_modules(course_id);

CREATE TABLE IF NOT EXISTS public.edu_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.edu_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INT DEFAULT 0,
  lesson_type TEXT CHECK (lesson_type IN ('lecture', 'interactive', 'code-along', 'quiz', 'project')) DEFAULT 'lecture',
  duration_minutes INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edu_lessons_module_id_idx ON public.edu_lessons(module_id);

CREATE TABLE IF NOT EXISTS public.edu_lesson_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
  content_type TEXT CHECK (content_type IN ('video', 'text', 'code_editor', 'quiz', 'resource')) NOT NULL,
  "order" INT DEFAULT 0,
  content_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edu_lesson_contents_lesson_id_idx ON public.edu_lesson_contents(lesson_id);

CREATE TABLE IF NOT EXISTS public.edu_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size INT,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edu_resources_lesson_id_idx ON public.edu_resources(lesson_id);

CREATE TABLE IF NOT EXISTS public.edu_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS edu_enrollments_course_id_idx ON public.edu_enrollments(course_id);

CREATE TABLE IF NOT EXISTS public.edu_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
  completion_percentage INT DEFAULT 0,
  time_spent_minutes INT DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS edu_student_progress_student_idx ON public.edu_student_progress(student_id);
CREATE INDEX IF NOT EXISTS edu_student_progress_course_idx ON public.edu_student_progress(course_id);

CREATE TABLE IF NOT EXISTS public.edu_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
  submission_type TEXT CHECK (submission_type IN ('quiz', 'code', 'assignment')) NOT NULL,
  submitted_code TEXT,
  answers JSONB,
  score INT,
  feedback TEXT,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS edu_submissions_lesson_student_idx ON public.edu_submissions(lesson_id, student_id);

-- Keep total_lessons in sync
CREATE OR REPLACE FUNCTION public.edu_refresh_course_total_lessons(p_course_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.edu_courses
  SET    total_lessons = (
      SELECT COUNT(*)::INT
      FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      WHERE em.course_id = p_course_id
    ),
    updated_at = NOW()
  WHERE id = p_course_id;
$$;

CREATE OR REPLACE FUNCTION public.trg_edu_lessons_refresh_course_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT em.course_id INTO cid    FROM public.edu_modules em
    WHERE em.id = OLD.module_id;
    IF cid IS NOT NULL THEN
      PERFORM public.edu_refresh_course_total_lessons(cid);
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.module_id IS DISTINCT FROM NEW.module_id THEN
    SELECT em.course_id INTO cid FROM public.edu_modules em WHERE em.id = OLD.module_id;
    IF cid IS NOT NULL THEN PERFORM public.edu_refresh_course_total_lessons(cid); END IF;
    SELECT em.course_id INTO cid FROM public.edu_modules em WHERE em.id = NEW.module_id;
    IF cid IS NOT NULL THEN PERFORM public.edu_refresh_course_total_lessons(cid); END IF;
    RETURN NEW;
  END IF;
  SELECT em.course_id INTO cid FROM public.edu_modules em WHERE em.id = NEW.module_id;
  IF cid IS NOT NULL THEN
    PERFORM public.edu_refresh_course_total_lessons(cid);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS edu_lessons_refresh_course_count ON public.edu_lessons;
CREATE TRIGGER edu_lessons_refresh_course_count
  AFTER INSERT OR DELETE OR UPDATE OF module_id ON public.edu_lessons
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_edu_lessons_refresh_course_count();

-- RLS
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_lesson_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_submissions ENABLE ROW LEVEL SECURITY;

-- edu_courses policies
CREATE POLICY edu_courses_admin_all ON public.edu_courses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_courses_instructor_rw ON public.edu_courses
  FOR ALL TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY edu_courses_select_published ON public.edu_courses
  FOR SELECT TO anon, authenticated
  USING (
    is_published = true
    AND COALESCE(is_archived, false) = false
  );

-- edu_modules
CREATE POLICY edu_modules_admin_all ON public.edu_modules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_modules_instructor_rw ON public.edu_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.edu_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY edu_modules_select_published ON public.edu_modules
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_courses c
      WHERE c.id = course_id
        AND c.is_published = true
        AND COALESCE(c.is_archived, false) = false
    )
  );

-- edu_lessons
CREATE POLICY edu_lessons_admin_all ON public.edu_lessons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_lessons_instructor_rw ON public.edu_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_modules em
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE em.id = module_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.edu_modules em
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE em.id = module_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY edu_lessons_select_published ON public.edu_lessons
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_modules em
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE em.id = module_id
        AND c.is_published = true
        AND COALESCE(c.is_archived, false) = false
    )
  );

-- edu_lesson_contents
CREATE POLICY edu_lesson_contents_admin_all ON public.edu_lesson_contents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_lesson_contents_instructor_rw ON public.edu_lesson_contents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY edu_lesson_contents_select_published ON public.edu_lesson_contents
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id
        AND c.is_published = true
        AND COALESCE(c.is_archived, false) = false
    )
  );

-- edu_resources
CREATE POLICY edu_resources_admin_all ON public.edu_resources
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_resources_instructor_rw ON public.edu_resources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY edu_resources_select_published ON public.edu_resources
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id
        AND c.is_published = true
        AND COALESCE(c.is_archived, false) = false
    )
  );

-- edu_enrollments
CREATE POLICY edu_enrollments_admin_all ON public.edu_enrollments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_enrollments_student_rw ON public.edu_enrollments
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY edu_enrollments_instructor_select ON public.edu_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- edu_student_progress
CREATE POLICY edu_student_progress_admin_all ON public.edu_student_progress
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_student_progress_student_rw ON public.edu_student_progress
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY edu_student_progress_instructor_select ON public.edu_student_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- edu_submissions
CREATE POLICY edu_submissions_admin_all ON public.edu_submissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY edu_submissions_student_rw ON public.edu_submissions
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY edu_submissions_instructor_select ON public.edu_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_lessons el
      INNER JOIN public.edu_modules em ON em.id = el.module_id
      INNER JOIN public.edu_courses c ON c.id = em.course_id
      WHERE el.id = lesson_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

COMMENT ON TABLE public.edu_courses IS 'Edu-AI V2 course (parallel to legacy public.courses).';
COMMENT ON TABLE public.edu_modules IS 'Edu-AI V2 module / chapter.';
