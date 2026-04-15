-- Step C: Course chapters, benefits, extended course_lessons.
-- Number 035 because 029 is already used in this repo.

-- ---------------------------------------------------------------------------
-- Extra catalog categories (soft skills / advanced skills for explore UI)
-- ---------------------------------------------------------------------------
INSERT INTO public.course_categories (name, slug, display_order) VALUES
  ('Ky nang nang cao', 'advanced-skills', 7),
  ('Kien thuc khac (ky nang mem)', 'soft-skills', 8)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Course marketing JSON (teacher-editable; student course detail)
-- ---------------------------------------------------------------------------
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS highlights JSONB;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS outcomes_after JSONB;

-- ---------------------------------------------------------------------------
-- course_benefits (intro tab grid)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  icon TEXT,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_benefits_course_id_idx
  ON public.course_benefits (course_id, display_order);

-- ---------------------------------------------------------------------------
-- course_chapters
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_chapters_course_id_idx
  ON public.course_chapters (course_id, order_index);

-- ---------------------------------------------------------------------------
-- Extend course_lessons
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS chapter_id UUID
  REFERENCES public.course_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text'
  CHECK (type IN ('text', 'video', 'quiz'));
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS time_estimate INT;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.course_lessons.time_estimate IS 'Estimated minutes.';
COMMENT ON COLUMN public.course_lessons.type IS 'Lesson type: text, video, or quiz.';

-- ---------------------------------------------------------------------------
-- RLS: course_benefits
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_benefits_select_public" ON public.course_benefits;
CREATE POLICY "course_benefits_select_public" ON public.course_benefits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "course_benefits_teacher_insert" ON public.course_benefits;
CREATE POLICY "course_benefits_teacher_insert" ON public.course_benefits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "course_benefits_teacher_update" ON public.course_benefits;
CREATE POLICY "course_benefits_teacher_update" ON public.course_benefits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_benefits.course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_benefits.course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "course_benefits_teacher_delete" ON public.course_benefits;
CREATE POLICY "course_benefits_teacher_delete" ON public.course_benefits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_benefits.course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: course_chapters
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_chapters_select_public" ON public.course_chapters;
CREATE POLICY "course_chapters_select_public" ON public.course_chapters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "course_chapters_teacher_insert" ON public.course_chapters;
CREATE POLICY "course_chapters_teacher_insert" ON public.course_chapters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "course_chapters_teacher_update" ON public.course_chapters;
CREATE POLICY "course_chapters_teacher_update" ON public.course_chapters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_chapters.course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_chapters.course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "course_chapters_teacher_delete" ON public.course_chapters;
CREATE POLICY "course_chapters_teacher_delete" ON public.course_chapters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_chapters.course_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );
