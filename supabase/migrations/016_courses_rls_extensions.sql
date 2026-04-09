-- Bổ sung RLS cho API courses / course_lessons: xóa (giáo viên), catalog công khai (anon).

-- Giáo viên xóa khóa học của mình
DROP POLICY IF EXISTS "Teacher delete own courses" ON public.courses;
CREATE POLICY "Teacher delete own courses" ON public.courses
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

-- Giáo viên xóa bài học thuộc khóa của mình
DROP POLICY IF EXISTS "Teacher delete own course_lessons" ON public.course_lessons;
CREATE POLICY "Teacher delete own course_lessons" ON public.course_lessons
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- Không đăng nhập vẫn xem được khóa / bài đã published (catalog)
DROP POLICY IF EXISTS "Anon view published courses" ON public.courses;
CREATE POLICY "Anon view published courses" ON public.courses
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "Anon view published course_lessons" ON public.course_lessons;
CREATE POLICY "Anon view published course_lessons" ON public.course_lessons
  FOR SELECT TO anon
  USING (status = 'published');

-- Cho phép đọc profile giáo viên (chỉ các id đang dạy khóa published) để join tên/avatar ở API
DROP POLICY IF EXISTS "Read profiles of published course teachers" ON public.profiles;
CREATE POLICY "Read profiles of published course teachers" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT teacher_id FROM public.courses
      WHERE status = 'published' AND teacher_id IS NOT NULL
    )
  );
