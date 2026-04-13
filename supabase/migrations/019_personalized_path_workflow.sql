-- Mở rộng workflow lộ trình cá nhân hóa + study_schedule + profiles (last_activity_at)
-- Không xóa dữ liệu; chỉ ALTER/ADD.

-- 1) Status personalized_paths: thêm draft, pending_student_approval, revision_requested (giữ các giá trị cũ)
ALTER TABLE public.personalized_paths
  DROP CONSTRAINT IF EXISTS personalized_paths_status_check;

ALTER TABLE public.personalized_paths
  ADD CONSTRAINT personalized_paths_status_check
  CHECK (
    status IN (
      'draft',
      'pending',
      'pending_student_approval',
      'revision_requested',
      'approved',
      'rejected',
      'active',
      'paused'
    )
  );

-- 2) study_schedule: đếm lần trượt deadline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_schedule' AND column_name = 'miss_count'
  ) THEN
    ALTER TABLE public.study_schedule ADD COLUMN miss_count INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3) profiles: hoạt động gần nhất (đóng băng khi > 3 ngày không tương tác)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_activity_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4) RLS: học sinh cập nhật path của mình (feedback / trạng thái sau khi GV gửi)
DROP POLICY IF EXISTS "Students update own personalized_paths" ON public.personalized_paths;
CREATE POLICY "Students update own personalized_paths" ON public.personalized_paths
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- 5) RLS: học sinh chèn lịch học cho path của mình (khi đồng ý lộ trình)
DROP POLICY IF EXISTS "Student insert own study_schedule" ON public.study_schedule;
CREATE POLICY "Student insert own study_schedule" ON public.study_schedule
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.personalized_paths p
      WHERE p.id = path_id AND p.student_id = auth.uid()
    )
  );

-- 6) RLS: giáo viên chèn lịch cho học sinh thuộc path mình quản lý (server/API có thể dùng)
DROP POLICY IF EXISTS "Teachers insert study_schedule for paths" ON public.study_schedule;
CREATE POLICY "Teachers insert study_schedule for paths" ON public.study_schedule
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_teacher_or_admin()
    AND EXISTS (
      SELECT 1 FROM public.personalized_paths p
      WHERE p.id = path_id
        AND (p.teacher_id = auth.uid() OR public.auth_is_admin())
    )
  );

-- 7) Học sinh xóa lịch của chính mình (làm lại lịch khi duyệt lộ trình mới)
DROP POLICY IF EXISTS "Student delete own study_schedule" ON public.study_schedule;
CREATE POLICY "Student delete own study_schedule" ON public.study_schedule
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
