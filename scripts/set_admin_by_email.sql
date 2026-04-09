-- Gán role admin theo email (bảng profiles không có cột email; email nằm ở auth.users).
-- Chạy trên Supabase SQL Editor; thay email bằng tài khoản của bạn.

UPDATE public.profiles AS p
SET role = 'admin'
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email = 'email_cua_ban@example.com';

-- Kiểm tra:
-- SELECT p.id, u.email, p.role FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE u.email = '...';
