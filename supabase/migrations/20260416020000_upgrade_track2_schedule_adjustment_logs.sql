-- Upgrade Track 2: minimal additive persistence for Smart Schedule V2 adjustment/override decisions.
-- Does not replace study_schedule as source of truth.

CREATE TABLE IF NOT EXISTS public.schedule_adjustment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_item_id UUID NULL REFERENCES public.study_schedule(id) ON DELETE SET NULL,
  teacher_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  path_id UUID NULL REFERENCES public.personalized_paths(id) ON DELETE SET NULL,
  adjustment_source TEXT NOT NULL CHECK (
    adjustment_source IN ('system_policy', 'teacher_override')
  ),
  adjustment_level TEXT NOT NULL CHECK (
    adjustment_level IN ('level_1', 'level_2', 'level_3', 'level_4')
  ),
  priority_before TEXT NULL CHECK (
    priority_before IS NULL OR priority_before IN ('critical', 'high', 'normal', 'light')
  ),
  priority_after TEXT NULL CHECK (
    priority_after IS NULL OR priority_after IN ('critical', 'high', 'normal', 'light')
  ),
  pacing_override TEXT NULL CHECK (
    pacing_override IS NULL OR pacing_override IN ('slow', 'steady', 'accelerated')
  ),
  decision_note TEXT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.schedule_adjustment_logs IS
  'Compact Smart Schedule V2 decision log for system policy actions and teacher overrides.';

CREATE INDEX IF NOT EXISTS idx_schedule_adjustment_logs_user_created
  ON public.schedule_adjustment_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_adjustment_logs_item_created
  ON public.schedule_adjustment_logs (schedule_item_id, created_at DESC)
  WHERE schedule_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_adjustment_logs_teacher_created
  ON public.schedule_adjustment_logs (teacher_id, created_at DESC)
  WHERE teacher_id IS NOT NULL;

ALTER TABLE public.schedule_adjustment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own schedule adjustment logs" ON public.schedule_adjustment_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Teachers view logs of owned schedule paths" ON public.schedule_adjustment_logs
  FOR SELECT TO authenticated
  USING (
    public.auth_is_teacher_or_admin()
    AND EXISTS (
      SELECT 1
      FROM public.personalized_paths p
      WHERE p.id = schedule_adjustment_logs.path_id
        AND (p.teacher_id = auth.uid() OR public.auth_is_admin())
    )
  );

CREATE POLICY "Teachers insert schedule adjustment logs for owned paths" ON public.schedule_adjustment_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_teacher_or_admin()
    AND (
      teacher_id = auth.uid()
      OR public.auth_is_admin()
      OR teacher_id IS NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.personalized_paths p
      WHERE p.id = schedule_adjustment_logs.path_id
        AND (p.teacher_id = auth.uid() OR public.auth_is_admin())
    )
  );

CREATE POLICY "Admin full access schedule adjustment logs" ON public.schedule_adjustment_logs
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());
