-- ============================================
-- MIGRATION: Thêm bảng mới cho EduAI
-- Ngày: 2025-04-09
-- Mô tả: courses, course_lessons, connection_requests, reports, mbti_results,
--        practice_exercises, practice_submissions + cột profiles (chỉ ADD IF NOT EXISTS)
-- Lưu ý: KHÔNG sửa/xóa profiles, learning_paths, code_submissions, topics, lessons (legacy)
--
-- QUAN TRỌNG: Bảng `lessons` (topic_id, is_published, …) ĐÃ CÓ từ schema cũ.
-- Bài học thuộc `courses` mới được đặt tên `course_lessons` để tránh trùng tên.
-- ============================================

-- 1. Bảng courses (độc lập với topics cũ)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_type TEXT NOT NULL CHECK (course_type IN ('skill', 'role')),
  category TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  enrolled_count INT DEFAULT 0,
  thumbnail_url TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bài học thuộc khóa học mới (KHÔNG dùng tên bảng `lessons` — đã reserved)
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  code_template TEXT,
  order_index INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  rejection_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_lessons_course_id_idx ON public.course_lessons(course_id);

-- 3. connection_requests
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  available_time TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  teacher_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- 4. reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('bug', 'content', 'other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. mbti_results
CREATE TABLE IF NOT EXISTS public.mbti_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mbti_type TEXT NOT NULL,
  test_date TIMESTAMPTZ DEFAULT NOW()
);

-- 6. practice_exercises (khác practice_questions nếu đã có)
CREATE TABLE IF NOT EXISTS public.practice_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  initial_code TEXT,
  test_code TEXT,
  language TEXT CHECK (language IN ('cpp', 'java', 'python')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. practice_submissions
CREATE TABLE IF NOT EXISTS public.practice_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.practice_exercises(id) ON DELETE CASCADE,
  code TEXT,
  output TEXT,
  error TEXT,
  ai_suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Cột mới cho profiles (chỉ ADD, schema-qualified)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'mbti_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN mbti_type TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'mbti_last_test'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN mbti_last_test TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birth_year'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birth_year INT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'school'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN school TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'class'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN class TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'interests'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'strengths'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN strengths TEXT[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'weaknesses'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN weaknesses TEXT[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'goal'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN goal TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'hours_per_day'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN hours_per_day INT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'learning_style'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN learning_style TEXT;
  END IF;
END $$;

-- ============================================
-- RLS: bật và policy (dùng auth_is_admin / auth_is_teacher_or_admin để tránh đệ quy)
-- Giả định migration 013 (auth_is_admin) và 015 (auth_is_teacher_or_admin) đã chạy.
-- ============================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mbti_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_submissions ENABLE ROW LEVEL SECURITY;

-- courses
DROP POLICY IF EXISTS "Admin full access courses" ON public.courses;
CREATE POLICY "Admin full access courses" ON public.courses
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "Teacher view own courses" ON public.courses;
CREATE POLICY "Teacher view own courses" ON public.courses
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teacher insert own courses" ON public.courses;
CREATE POLICY "Teacher insert own courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_teacher_or_admin()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'teacher'
    AND teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "Teacher update own courses" ON public.courses;
CREATE POLICY "Teacher update own courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() AND public.auth_is_teacher_or_admin())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Public view published courses" ON public.courses;
CREATE POLICY "Public view published courses" ON public.courses
  FOR SELECT TO authenticated
  USING (status = 'published');

-- course_lessons
DROP POLICY IF EXISTS "Admin full access course_lessons" ON public.course_lessons;
CREATE POLICY "Admin full access course_lessons" ON public.course_lessons
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "Teacher view own course lessons" ON public.course_lessons;
CREATE POLICY "Teacher view own course lessons" ON public.course_lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teacher insert course_lessons" ON public.course_lessons;
CREATE POLICY "Teacher insert course_lessons" ON public.course_lessons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('teacher', 'admin')
  );

DROP POLICY IF EXISTS "Teacher update own course lessons" ON public.course_lessons;
CREATE POLICY "Teacher update own course lessons" ON public.course_lessons
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public view published course_lessons" ON public.course_lessons;
CREATE POLICY "Public view published course_lessons" ON public.course_lessons
  FOR SELECT TO authenticated
  USING (status = 'published');

-- connection_requests
DROP POLICY IF EXISTS "Student view own requests" ON public.connection_requests;
CREATE POLICY "Student view own requests" ON public.connection_requests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teacher view requests to them" ON public.connection_requests;
CREATE POLICY "Teacher view requests to them" ON public.connection_requests
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Student insert requests" ON public.connection_requests;
CREATE POLICY "Student insert requests" ON public.connection_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'student'
    AND student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Teacher update requests" ON public.connection_requests;
CREATE POLICY "Teacher update requests" ON public.connection_requests
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- reports
DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin view all reports" ON public.reports;
CREATE POLICY "Admin view all reports" ON public.reports
  FOR SELECT TO authenticated
  USING (public.auth_is_admin());

DROP POLICY IF EXISTS "Users view own reports" ON public.reports;
CREATE POLICY "Users view own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- mbti_results
DROP POLICY IF EXISTS "Users view own mbti" ON public.mbti_results;
CREATE POLICY "Users view own mbti" ON public.mbti_results
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own mbti" ON public.mbti_results;
CREATE POLICY "Users insert own mbti" ON public.mbti_results
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- practice_exercises
DROP POLICY IF EXISTS "Anyone view practice exercises" ON public.practice_exercises;
CREATE POLICY "Anyone view practice exercises" ON public.practice_exercises
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin manage practice exercises" ON public.practice_exercises;
CREATE POLICY "Admin manage practice exercises" ON public.practice_exercises
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- practice_submissions
DROP POLICY IF EXISTS "Users view own practice submissions" ON public.practice_submissions;
CREATE POLICY "Users view own practice submissions" ON public.practice_submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own practice submissions" ON public.practice_submissions;
CREATE POLICY "Users insert own practice submissions" ON public.practice_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin view all practice submissions" ON public.practice_submissions;
CREATE POLICY "Admin view all practice submissions" ON public.practice_submissions
  FOR SELECT TO authenticated
  USING (public.auth_is_admin());
