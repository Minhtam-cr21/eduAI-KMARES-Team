-- last_updated + cho phép giáo viên xóa yêu cầu; admin sửa/xóa mọi yêu cầu.

ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.connection_requests.last_updated IS 'Cập nhật khi GV/admin thay đổi trạng thái hoặc phản hồi.';

DROP POLICY IF EXISTS "Teacher update requests" ON public.connection_requests;
CREATE POLICY "Teacher update requests" ON public.connection_requests
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.auth_is_admin())
  WITH CHECK (teacher_id = auth.uid() OR public.auth_is_admin());

DROP POLICY IF EXISTS "Teacher delete connection_requests" ON public.connection_requests;
CREATE POLICY "Teacher delete connection_requests" ON public.connection_requests
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR public.auth_is_admin());
