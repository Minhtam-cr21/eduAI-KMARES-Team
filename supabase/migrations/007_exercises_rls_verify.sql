-- Chạy sau 006 nếu cần đảm bảo RLS + policy (idempotent).
-- Trên Supabase, bảng `exercises` mặc định đã có GRANT cho `authenticated` / `anon`.

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

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
