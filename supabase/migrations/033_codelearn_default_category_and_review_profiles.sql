-- Step B: default category_id for legacy rows; public read of reviewer profiles.

UPDATE public.courses c
SET category_id = (SELECT id FROM public.course_categories WHERE slug = 'all' LIMIT 1)
WHERE c.category_id IS NULL;

UPDATE public.courses SET total_lessons = (
  SELECT COUNT(*)::INT FROM public.course_lessons cl
  WHERE cl.course_id = courses.id AND cl.status = 'published'
);

DROP POLICY IF EXISTS "Read profiles of course review authors" ON public.profiles;
CREATE POLICY "Read profiles of course review authors" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_reviews cr
      WHERE cr.user_id = profiles.id
    )
  );
