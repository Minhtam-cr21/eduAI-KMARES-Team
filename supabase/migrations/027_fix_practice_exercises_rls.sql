-- Bước 18: Cho phép admin/teacher quản lý practice_exercises; SELECT cho mọi authenticated;
-- API random insert dùng service role (bỏ qua RLS) — migration này căn chỉnh policy cho teacher và đọc.

-- Cho phép admin và teacher insert/update/delete practice_exercises
DROP POLICY IF EXISTS "Admin manage practice exercises" ON public.practice_exercises;
CREATE POLICY "Admin manage practice exercises" ON public.practice_exercises
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher'))
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Cho phép authenticated users đọc (SELECT) bài tập
DROP POLICY IF EXISTS "Anyone view practice exercises" ON public.practice_exercises;
CREATE POLICY "Anyone view practice exercises" ON public.practice_exercises
  FOR SELECT
  TO authenticated
  USING (true);
