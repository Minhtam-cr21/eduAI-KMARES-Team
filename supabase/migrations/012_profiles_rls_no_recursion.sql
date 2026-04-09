-- Sửa lỗi "infinite recursion detected in policy for relation 'profiles'".
-- Nguyên nhân: policy "Admins can select all profiles" (011) dùng EXISTS/SELECT vào profiles
-- trong chính policy của profiles → đệ quy.
-- Giải pháp: kiểm tra admin trong hàm SECURITY DEFINER với row_security = off.

CREATE OR REPLACE FUNCTION public.auth_is_admin()
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
      AND p.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.auth_is_admin() IS
  'RLS-safe: đọc role admin không kích hoạt policy trên profiles.';

GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO service_role;

DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;

CREATE POLICY "Admins can select all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.auth_is_admin());
