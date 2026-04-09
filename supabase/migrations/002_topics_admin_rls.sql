-- Cho phép admin (profiles.role = 'admin') đọc/ghi toàn bộ topics.
-- SELECT: policy "Anyone can view published topics" vẫn cho mọi người xem bản ghi đã publish;
-- policy dưới đây cho phép admin xem cả bản ghi chưa publish.
-- Idempotent: có thể chạy lại sau khi đã tạo policy (DROP IF EXISTS trước khi CREATE).

DROP POLICY IF EXISTS "Admins can select all topics" ON public.topics;
CREATE POLICY "Admins can select all topics" ON public.topics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert topics" ON public.topics;
CREATE POLICY "Admins can insert topics" ON public.topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update topics" ON public.topics;
CREATE POLICY "Admins can update topics" ON public.topics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete topics" ON public.topics;
CREATE POLICY "Admins can delete topics" ON public.topics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
