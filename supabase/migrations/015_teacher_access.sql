-- Quyền giáo viên: xem profile học sinh, learning_paths, code_submissions (đọc).
-- Dùng SECURITY DEFINER giống auth_is_admin để tránh đệ quy RLS.

CREATE OR REPLACE FUNCTION public.auth_is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'admin')
  );
$$;

COMMENT ON FUNCTION public.auth_is_teacher_or_admin() IS
  'RLS-safe: teacher hoặc admin, không đệ quy policy trên profiles.';

GRANT EXECUTE ON FUNCTION public.auth_is_teacher_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_teacher_or_admin() TO service_role;

DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;
CREATE POLICY "Teachers can view student profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (role = 'student' AND public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers view learning paths" ON public.learning_paths;
CREATE POLICY "Teachers view learning paths" ON public.learning_paths
  FOR SELECT
  TO authenticated
  USING (public.auth_is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers view all submissions" ON public.code_submissions;
CREATE POLICY "Teachers view all submissions" ON public.code_submissions
  FOR SELECT
  TO authenticated
  USING (public.auth_is_teacher_or_admin());

-- Danh sách học sinh + email (auth.users) + thống kê learning_paths (1 RPC, tránh expose auth.users qua PostgREST).
CREATE OR REPLACE FUNCTION public.teacher_list_students_with_stats()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  goal text,
  hours_per_day int,
  learning_paths_total bigint,
  learning_paths_completed bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT
    p.id,
    u.email::text,
    p.full_name,
    p.goal,
    p.hours_per_day,
    COALESCE(COUNT(lp.id), 0)::bigint AS learning_paths_total,
    COALESCE(COUNT(lp.id) FILTER (WHERE lp.status = 'completed'), 0)::bigint
      AS learning_paths_completed
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.learning_paths lp ON lp.student_id = p.id
  WHERE p.role = 'student'
    AND EXISTS (
      SELECT 1
      FROM public.profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('teacher', 'admin')
    )
  GROUP BY p.id, u.email, p.full_name, p.goal, p.hours_per_day;
$$;

COMMENT ON FUNCTION public.teacher_list_students_with_stats() IS
  'Chỉ teacher/admin: danh sách học sinh kèm email và tiến độ lộ trình.';

GRANT EXECUTE ON FUNCTION public.teacher_list_students_with_stats() TO authenticated;
