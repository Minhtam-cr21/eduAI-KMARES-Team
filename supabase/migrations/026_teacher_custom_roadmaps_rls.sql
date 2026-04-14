-- Giáo viên xem / cập nhật custom_roadmaps của học sinh đã kết nối (accepted).

CREATE POLICY "Teachers view connected students custom_roadmaps"
  ON public.custom_roadmaps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.connection_requests cr
      WHERE cr.student_id = custom_roadmaps.user_id
        AND cr.teacher_id = auth.uid()
        AND cr.status = 'accepted'
    )
  );

CREATE POLICY "Teachers update connected students custom_roadmaps"
  ON public.custom_roadmaps FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.connection_requests cr
      WHERE cr.student_id = custom_roadmaps.user_id
        AND cr.teacher_id = auth.uid()
        AND cr.status = 'accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.connection_requests cr
      WHERE cr.student_id = custom_roadmaps.user_id
        AND cr.teacher_id = auth.uid()
        AND cr.status = 'accepted'
    )
  );
