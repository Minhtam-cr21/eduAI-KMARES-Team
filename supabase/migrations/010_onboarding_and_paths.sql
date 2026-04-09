-- Bước 3.1: Cột onboarding cho profiles; bảng learning_paths (nếu chưa có) + created_at.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hours_per_day INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_learning TEXT;

CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
