-- Bảng bài tập (exercise) gắn với lesson — chạy trong Supabase SQL Editor (hoặc supabase db push).

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  hint_logic TEXT,
  code_hint TEXT,
  initial_code TEXT,
  language TEXT NOT NULL DEFAULT 'python',
  sample_input TEXT,
  sample_output TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exercises_lesson_id_idx ON public.exercises(lesson_id);
CREATE INDEX IF NOT EXISTS exercises_order_idx ON public.exercises(lesson_id, order_index);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Học sinh đã đăng nhập: chỉ xem exercise thuộc bài học & chủ đề đã xuất bản
DROP POLICY IF EXISTS "Authenticated view exercises for published lessons" ON public.exercises;
CREATE POLICY "Authenticated view exercises for published lessons" ON public.exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      INNER JOIN public.topics t ON t.id = l.topic_id
      WHERE l.id = exercises.lesson_id
        AND l.is_published = true
        AND t.is_published = true
    )
  );

-- (Tuỳ chọn) Cho phép đọc công khai giống lessons — nếu muốn anon xem:
-- DROP POLICY IF EXISTS "Anyone view exercises for published lessons" ON public.exercises;
-- CREATE POLICY "Anyone view exercises for published lessons" ON public.exercises
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.lessons l
--       INNER JOIN public.topics t ON t.id = l.topic_id
--       WHERE l.id = exercises.lesson_id AND l.is_published = true AND t.is_published = true
--     )
--   );

-- Kiểm tra nhanh sau khi chạy (tuỳ chọn):
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.exercises'::regclass;  -- phải là true
-- Xem thêm migration 007_exercises_rls_verify.sql nếu cần chạy lại policy idempotent.
