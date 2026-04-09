-- Quota AI gợi ý (3 lần/ngày / user). Đồng bộ với trigger đăng ký.

CREATE TABLE IF NOT EXISTS public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_requests_today INT DEFAULT 0 NOT NULL,
  last_request_date DATE DEFAULT CURRENT_DATE NOT NULL
);

ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quota" ON public.user_quotas;
CREATE POLICY "Users can view own quota" ON public.user_quotas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quota" ON public.user_quotas;
CREATE POLICY "Users can update own quota" ON public.user_quotas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quota" ON public.user_quotas;
CREATE POLICY "Users can insert own quota" ON public.user_quotas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.user_quotas (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_quotas (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
