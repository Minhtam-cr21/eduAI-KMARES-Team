-- Phase 2: teacher self-publish courses (no admin approval gate), AI metadata, public teacher roadmaps library.
-- File 030 (028/029 already used).

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS content TEXT;

-- Backfill from legacy status: publish pending + published; keep rejected hidden unless already published.
UPDATE public.courses SET is_published = true, status = 'published' WHERE status IN ('pending', 'published');
UPDATE public.courses SET is_published = false WHERE status = 'rejected';
UPDATE public.courses SET is_published = COALESCE(is_published, true);

ALTER TABLE public.courses ALTER COLUMN is_published SET DEFAULT TRUE;

-- Catalog visibility: use is_published (status kept for legacy only).
DROP POLICY IF EXISTS "Public view published courses" ON public.courses;
CREATE POLICY "Public view published courses" ON public.courses
  FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Anon view published courses" ON public.courses;
CREATE POLICY "Anon view published courses" ON public.courses
  FOR SELECT TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "Read profiles of published course teachers" ON public.profiles;
CREATE POLICY "Read profiles of published course teachers" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT teacher_id FROM public.courses
      WHERE is_published = true AND teacher_id IS NOT NULL
    )
  );

-- Teacher-published roadmaps (separate from custom_roadmaps / embeddings).
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  image_url TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS roadmaps_teacher_id_idx ON public.roadmaps(teacher_id);
CREATE INDEX IF NOT EXISTS roadmaps_is_public_idx ON public.roadmaps(is_public);

ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmaps_select_auth" ON public.roadmaps;
CREATE POLICY "roadmaps_select_auth" ON public.roadmaps
  FOR SELECT TO authenticated
  USING (
    public.auth_is_admin()
    OR is_public = true
    OR teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "roadmaps_select_anon" ON public.roadmaps;
CREATE POLICY "roadmaps_select_anon" ON public.roadmaps
  FOR SELECT TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS "roadmaps_insert" ON public.roadmaps;
CREATE POLICY "roadmaps_insert" ON public.roadmaps
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_admin()
    OR (
      teacher_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'teacher'
      )
    )
  );

DROP POLICY IF EXISTS "roadmaps_update" ON public.roadmaps;
CREATE POLICY "roadmaps_update" ON public.roadmaps
  FOR UPDATE TO authenticated
  USING (public.auth_is_admin() OR teacher_id = auth.uid())
  WITH CHECK (public.auth_is_admin() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "roadmaps_delete" ON public.roadmaps;
CREATE POLICY "roadmaps_delete" ON public.roadmaps
  FOR DELETE TO authenticated
  USING (public.auth_is_admin() OR teacher_id = auth.uid());
