-- Step A (CodeLearn): course_categories, extended courses, course_reviews, vouchers.
-- Numbered 032 because 028-031 are already used in this repo.
-- Only ADD / CREATE; no dropping business columns or tables.

-- ---------------------------------------------------------------------------
-- Course categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_categories_display_order_idx
  ON public.course_categories (display_order, name);

INSERT INTO public.course_categories (name, slug, display_order) VALUES
  ('Tất cả khóa học', 'all', 0),
  ('Thuật toán', 'algorithms', 1),
  ('Kiến thức cơ sở', 'fundamentals', 2),
  ('Lập trình cơ sở', 'basic-programming', 3),
  ('Lập trình nâng cao', 'advanced-programming', 4),
  ('Giải quyết vấn đề', 'problem-solving', 5),
  ('Prompt Engineering', 'prompt-engineering', 6)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- New columns on courses (enrolled_count already exists on courses)
-- ---------------------------------------------------------------------------
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category_id UUID
  REFERENCES public.course_categories(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_hours INT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_lessons INT NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level TEXT
  CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced', 'all_levels'))
  DEFAULT 'beginner';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS objectives TEXT[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS what_you_will_learn TEXT[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requirements TEXT[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS faq JSONB;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS promo_video_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS courses_category_id_idx ON public.courses (category_id);

-- Backfill category_id from legacy text column courses.category (see migration 031)
UPDATE public.courses c
SET category_id = cc.id
FROM public.course_categories cc
WHERE c.category_id IS NULL
  AND (
    (c.category = 'Algorithms' AND cc.slug = 'algorithms')
    OR (c.category = 'Basic Knowledge' AND cc.slug = 'fundamentals')
    OR (c.category = 'Basic Programming' AND cc.slug = 'basic-programming')
    OR (c.category = 'Advanced Programming' AND cc.slug = 'advanced-programming')
    OR (c.category = 'Problem Solving' AND cc.slug = 'problem-solving')
    OR (c.category = 'Prompt Engineering' AND cc.slug = 'prompt-engineering')
  );

-- Initial total_lessons; trigger keeps it in sync afterward
UPDATE public.courses SET total_lessons = (
  SELECT COUNT(*)::INT FROM public.course_lessons cl
  WHERE cl.course_id = courses.id AND cl.status = 'published'
);

-- ---------------------------------------------------------------------------
-- Keep total_lessons in sync when course_lessons change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_course_total_lessons(p_course_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.courses
  SET total_lessons = (
    SELECT COUNT(*)::INT FROM public.course_lessons cl
    WHERE cl.course_id = p_course_id AND cl.status = 'published'
  )
  WHERE id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_course_lessons_refresh_total_lessons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.set_course_total_lessons(OLD.course_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    PERFORM public.set_course_total_lessons(OLD.course_id);
    PERFORM public.set_course_total_lessons(NEW.course_id);
    RETURN NEW;
  ELSE
    PERFORM public.set_course_total_lessons(NEW.course_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS course_lessons_refresh_total_lessons ON public.course_lessons;
CREATE TRIGGER course_lessons_refresh_total_lessons
  AFTER INSERT OR DELETE OR UPDATE OF course_id, status ON public.course_lessons
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_course_lessons_refresh_total_lessons();

-- ---------------------------------------------------------------------------
-- Course reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS course_reviews_course_id_idx ON public.course_reviews (course_id);

-- ---------------------------------------------------------------------------
-- Vouchers (optional)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INT NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  valid_from DATE,
  valid_to DATE,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.course_categories;
CREATE POLICY "Anyone can view categories" ON public.course_categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin full access categories" ON public.course_categories;
CREATE POLICY "Admin full access categories" ON public.course_categories
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.course_reviews;
CREATE POLICY "Anyone can view reviews" ON public.course_reviews
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Enrolled users insert own course reviews" ON public.course_reviews;
CREATE POLICY "Enrolled users insert own course reviews" ON public.course_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_courses uc
      WHERE uc.user_id = auth.uid()
        AND uc.course_id = course_id
    )
  );

DROP POLICY IF EXISTS "Users can update own reviews" ON public.course_reviews;
CREATE POLICY "Users can update own reviews" ON public.course_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can delete reviews" ON public.course_reviews;
CREATE POLICY "Admin can delete reviews" ON public.course_reviews
  FOR DELETE TO authenticated
  USING (public.auth_is_admin());

DROP POLICY IF EXISTS "Teacher admin full access vouchers" ON public.vouchers;
CREATE POLICY "Teacher admin full access vouchers" ON public.vouchers
  FOR ALL TO authenticated
  USING (public.auth_is_teacher_or_admin())
  WITH CHECK (public.auth_is_teacher_or_admin());

COMMENT ON TABLE public.course_categories IS 'Catalog categories; public read, admin write.';
COMMENT ON TABLE public.course_reviews IS 'One review per user per course; insert requires enrollment.';
COMMENT ON TABLE public.vouchers IS 'Discount codes; teacher/admin via RLS.';
