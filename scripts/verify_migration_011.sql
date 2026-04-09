-- Kiểm tra migration 011 (cột goals trên lessons + hàm get_missing_lessons_for_user).
-- Kỳ vọng: 1 dòng với data_type = ARRAY hoặc tương đương; hàm tồn tại.

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lessons'
  AND column_name = 'goals';

SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname = 'get_missing_lessons_for_user';
