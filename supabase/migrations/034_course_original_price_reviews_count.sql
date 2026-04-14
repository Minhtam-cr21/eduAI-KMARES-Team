-- Sale price display + review counts on catalog cards.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS reviews_count INT NOT NULL DEFAULT 0;

UPDATE public.courses c
SET reviews_count = (
  SELECT COUNT(*)::INT FROM public.course_reviews r WHERE r.course_id = c.id
);

CREATE OR REPLACE FUNCTION public.trg_course_reviews_recount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected UUID[];
  u UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    affected := ARRAY[OLD.course_id, NEW.course_id];
  ELSIF TG_OP = 'DELETE' THEN
    affected := ARRAY[OLD.course_id];
  ELSE
    affected := ARRAY[NEW.course_id];
  END IF;

  FOREACH u IN ARRAY affected
  LOOP
    IF u IS NULL THEN
      CONTINUE;
    END IF;
    UPDATE public.courses co
    SET reviews_count = (SELECT COUNT(*)::INT FROM public.course_reviews r WHERE r.course_id = u)
    WHERE co.id = u;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_reviews_recount_on_change ON public.course_reviews;
CREATE TRIGGER course_reviews_recount_on_change
  AFTER INSERT OR DELETE OR UPDATE OF course_id ON public.course_reviews
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_course_reviews_recount();
