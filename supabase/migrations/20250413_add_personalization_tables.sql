-- ============================================
-- MIGRATION: Thêm bảng cho cá nhân hóa nâng cao
-- Ngày: 2025-04-13
-- Mô tả: assessment_responses, career_orientations, personalized_paths, study_schedule
-- ============================================

-- 1. Bảng lưu câu trả lời bài test (50 câu)
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng lưu kết quả phân tích (định hướng nghề, điểm các trụ cột)
CREATE TABLE IF NOT EXISTS public.career_orientations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mbti_type TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  suggested_careers TEXT[],
  suggested_courses UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng lộ trình cá nhân hóa (giáo viên tạo/duyệt)
CREATE TABLE IF NOT EXISTS public.personalized_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id),
  course_sequence JSONB, -- [{ course_id: uuid, order_index: int, due_date: date, note: text }]
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'paused')),
  student_feedback TEXT,
  teacher_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng lịch trình học tập chi tiết (từ personalized_paths)
CREATE TABLE IF NOT EXISTS public.study_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  path_id UUID REFERENCES public.personalized_paths(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'frozen')),
  frozen_until DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Thêm cột mới vào bảng profiles (nếu chưa có)
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
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'career_orientation'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN career_orientation TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assessment_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN assessment_completed BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assessment_completed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN assessment_completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- RLS Policies
-- Dùng auth_is_admin / auth_is_teacher_or_admin (migrations 013, 015) để tránh đệ quy RLS trên profiles.
-- ============================================

ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_orientations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_schedule ENABLE ROW LEVEL SECURITY;

-- assessment_responses
CREATE POLICY "Users can view own assessment responses" ON public.assessment_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessment responses" ON public.assessment_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessment responses" ON public.assessment_responses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers view assessment responses" ON public.assessment_responses
  FOR SELECT TO authenticated
  USING (public.auth_is_teacher_or_admin());

CREATE POLICY "Admin full access assessment_responses" ON public.assessment_responses
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- career_orientations
CREATE POLICY "Users view own career orientation" ON public.career_orientations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own career orientation" ON public.career_orientations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own career orientation" ON public.career_orientations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers view career orientations" ON public.career_orientations
  FOR SELECT TO authenticated
  USING (public.auth_is_teacher_or_admin());

CREATE POLICY "Admin full access career_orientations" ON public.career_orientations
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- personalized_paths
CREATE POLICY "Students view own paths" ON public.personalized_paths
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers view paths they manage" ON public.personalized_paths
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.auth_is_admin());

CREATE POLICY "Teachers insert paths" ON public.personalized_paths
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_is_teacher_or_admin());

CREATE POLICY "Teachers update paths" ON public.personalized_paths
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.auth_is_admin())
  WITH CHECK (teacher_id = auth.uid() OR public.auth_is_admin());

CREATE POLICY "Admin full access personalized_paths" ON public.personalized_paths
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- study_schedule
CREATE POLICY "Students view own schedule" ON public.study_schedule
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Teachers view schedule of their students" ON public.study_schedule
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.personalized_paths pp
      WHERE pp.id = study_schedule.path_id
        AND pp.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students update own schedule" ON public.study_schedule
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System update schedule status" ON public.study_schedule
  FOR UPDATE TO authenticated
  USING (public.auth_is_teacher_or_admin())
  WITH CHECK (public.auth_is_teacher_or_admin());

CREATE POLICY "Admin full access study_schedule" ON public.study_schedule
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());
