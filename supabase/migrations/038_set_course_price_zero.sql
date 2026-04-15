-- All courses free: zero price and default for new rows.
UPDATE public.courses SET price = 0;
ALTER TABLE public.courses ALTER COLUMN price SET DEFAULT 0;
