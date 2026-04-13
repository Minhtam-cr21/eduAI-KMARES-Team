-- Bảng thông báo in-app (teacher/admin). INSERT chỉ qua service_role (API server), không policy INSERT cho authenticated.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Học sinh đã xong test, chưa có lộ trình CH ở trạng thái active / chờ HS duyệt.
-- Admin: toàn bộ; Giáo viên: chỉ HS đã kết nối (accepted).
CREATE OR REPLACE FUNCTION public.teacher_students_completed_assessment_pending_path()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  assessment_completed_at timestamptz,
  mbti_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    u.email::text AS email,
    p.assessment_completed_at,
    (
      SELECT co.mbti_type
      FROM public.career_orientations co
      WHERE co.user_id = p.id
      ORDER BY co.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS mbti_type
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'student'
    AND p.assessment_completed IS TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM public.personalized_paths pp
      WHERE pp.student_id = p.id
        AND pp.status IN ('active', 'pending_student_approval')
    )
    AND (
      public.auth_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.connection_requests cr
        WHERE cr.student_id = p.id
          AND cr.teacher_id = auth.uid()
          AND cr.status = 'accepted'
      )
    )
  ORDER BY p.assessment_completed_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.teacher_students_completed_assessment_pending_path() IS
  'Teacher/admin: HS đã hoàn thành assessment, chưa có personalized_paths active hoặc pending_student_approval.';

GRANT EXECUTE ON FUNCTION public.teacher_students_completed_assessment_pending_path() TO authenticated;
