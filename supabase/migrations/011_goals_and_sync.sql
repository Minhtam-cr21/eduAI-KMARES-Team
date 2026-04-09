-- Goals trên lessons + function hỗ trợ; policy admin đọc profiles (đồng bộ lộ trình).

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.get_missing_lessons_for_user(p_user_id UUID)
RETURNS TABLE(lesson_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT l.id
  FROM public.lessons l
  WHERE l.is_published = true
    AND NOT EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.student_id = p_user_id AND lp.lesson_id = l.id
    );
$$;

DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;
CREATE POLICY "Admins can select all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
