-- Bước 2.1: Bảng exercises (đồng bộ với spec; idempotent). Sau migration 006 khi có sẵn bảng.

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  hint_logic TEXT,
  code_hint TEXT,
  initial_code TEXT,
  sample_input TEXT,
  sample_output TEXT,
  language TEXT NOT NULL DEFAULT 'python',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exercises_lesson_id_idx ON public.exercises(lesson_id);
CREATE INDEX IF NOT EXISTS exercises_order_idx ON public.exercises(lesson_id, order_index);

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS hint_logic TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS code_hint TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS initial_code TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS sample_input TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS sample_output TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS order_index INT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.exercises SET language = 'python' WHERE language IS NULL;
UPDATE public.exercises SET order_index = 0 WHERE order_index IS NULL;

ALTER TABLE public.exercises ALTER COLUMN language SET DEFAULT 'python';
ALTER TABLE public.exercises ALTER COLUMN order_index SET DEFAULT 0;
ALTER TABLE public.exercises ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.exercises ALTER COLUMN language SET NOT NULL;
ALTER TABLE public.exercises ALTER COLUMN order_index SET NOT NULL;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select all exercises" ON public.exercises;
CREATE POLICY "Admins can select all exercises" ON public.exercises
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
CREATE POLICY "Admins can insert exercises" ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    AND lesson_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
CREATE POLICY "Admins can update exercises" ON public.exercises
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
CREATE POLICY "Admins can delete exercises" ON public.exercises
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
