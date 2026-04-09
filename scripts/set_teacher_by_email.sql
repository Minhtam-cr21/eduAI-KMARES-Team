-- Gán role teacher (join auth.users vì profiles không có cột email).
UPDATE public.profiles AS p
SET role = 'teacher'
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email = 'email_giao_vien@example.com';
