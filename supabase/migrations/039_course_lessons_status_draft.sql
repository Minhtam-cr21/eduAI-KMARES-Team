-- Allow draft lessons (e.g. quiz being composed before full publish).
ALTER TABLE public.course_lessons DROP CONSTRAINT IF EXISTS course_lessons_status_check;
ALTER TABLE public.course_lessons ADD CONSTRAINT course_lessons_status_check
  CHECK (status IN ('pending', 'published', 'rejected', 'draft'));
