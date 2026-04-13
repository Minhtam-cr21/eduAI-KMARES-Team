-- Bước 5+6: practice_submissions hỗ trợ bài theo lesson; cột ví dụ I/O cho practice_exercises;
-- RLS DELETE cho reset trắc nghiệm (submit đã dùng .delete()).

-- 1) practice_exercises: ví dụ input/output (tuỳ chọn)
ALTER TABLE public.practice_exercises
  ADD COLUMN IF NOT EXISTS input_example TEXT;
ALTER TABLE public.practice_exercises
  ADD COLUMN IF NOT EXISTS output_example TEXT;

-- 2) practice_submissions: lesson_id, exercise_id có thể null nhưng phải có ít nhất một mục tiêu
ALTER TABLE public.practice_submissions
  ALTER COLUMN exercise_id DROP NOT NULL;

ALTER TABLE public.practice_submissions
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS practice_submissions_lesson_id_idx
  ON public.practice_submissions(lesson_id);

ALTER TABLE public.practice_submissions
  DROP CONSTRAINT IF EXISTS practice_submissions_target_chk;

ALTER TABLE public.practice_submissions
  ADD CONSTRAINT practice_submissions_target_chk
  CHECK (exercise_id IS NOT NULL OR lesson_id IS NOT NULL);

-- 3) RLS: cho phép học sinh xóa dữ liệu trắc nghiệm của chính mình (reset / submit ghi đè)
DROP POLICY IF EXISTS "Users can delete own assessment responses" ON public.assessment_responses;
CREATE POLICY "Users can delete own assessment responses" ON public.assessment_responses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own career orientations" ON public.career_orientations;
CREATE POLICY "Users can delete own career orientations" ON public.career_orientations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
