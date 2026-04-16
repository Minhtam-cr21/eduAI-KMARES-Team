-- Phase 5: persisted teacher review workflow for personalized path and schedule insight.
-- This is additive and intentionally stores only compact review snapshots / notes,
-- not the full underlying personalized path or study_schedule payloads.

CREATE TABLE IF NOT EXISTS public.teacher_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path_id UUID REFERENCES public.personalized_paths(id) ON DELETE SET NULL,
  review_kind TEXT NOT NULL CHECK (review_kind IN ('personalized_path', 'schedule_insight')),
  review_status TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  source TEXT,
  action_recommendation TEXT,
  review_note TEXT,
  adjustment_note TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.teacher_review_events IS
  'Append-only teacher review records for personalized path and schedule insight workflow.';

COMMENT ON COLUMN public.teacher_review_events.path_id IS
  'Linked personalized path when review_kind = personalized_path; null for schedule insight reviews.';

COMMENT ON COLUMN public.teacher_review_events.snapshot IS
  'Compact persisted snapshot for audit/review context. Avoid copying full item lists or large payloads.';

CREATE INDEX IF NOT EXISTS idx_teacher_review_events_teacher_kind_created
  ON public.teacher_review_events (teacher_id, review_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_review_events_student_kind_created
  ON public.teacher_review_events (student_id, review_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_review_events_path_created
  ON public.teacher_review_events (path_id, created_at DESC)
  WHERE path_id IS NOT NULL;

ALTER TABLE public.teacher_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own teacher review events" ON public.teacher_review_events
  FOR SELECT TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND teacher_id = auth.uid())
    OR public.auth_is_admin()
  );

CREATE POLICY "Teachers insert own teacher review events" ON public.teacher_review_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND teacher_id = auth.uid() AND public.auth_is_teacher_or_admin())
    OR public.auth_is_admin()
  );

CREATE POLICY "Admin full access teacher review events" ON public.teacher_review_events
  FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());
