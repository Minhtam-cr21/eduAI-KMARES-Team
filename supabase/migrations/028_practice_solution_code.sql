-- Bước 18c: Đáp án mẫu + theo dõi xem đáp án
ALTER TABLE public.practice_exercises
  ADD COLUMN IF NOT EXISTS solution_code TEXT;

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS solution_code TEXT;

ALTER TABLE public.practice_submissions
  ADD COLUMN IF NOT EXISTS viewed_solution BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.practice_exercises.solution_code IS 'Code mẫu đáp án (hiển thị khi học sinh bấm Xem đáp án).';
COMMENT ON COLUMN public.course_lessons.solution_code IS 'Đáp án coding lesson (tuỳ chọn).';
COMMENT ON COLUMN public.practice_submissions.viewed_solution IS 'Học sinh đã mở xem đáp án (nếu có).';
