  -- Thêm policy INSERT + UPDATE cho learning_paths (học sinh tự đánh dấu hoàn thành).

  DROP POLICY IF EXISTS "Students insert own learning paths" ON public.learning_paths;
  CREATE POLICY "Students insert own learning paths" ON public.learning_paths
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

  DROP POLICY IF EXISTS "Students update own learning paths" ON public.learning_paths;
  CREATE POLICY "Students update own learning paths" ON public.learning_paths
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);
