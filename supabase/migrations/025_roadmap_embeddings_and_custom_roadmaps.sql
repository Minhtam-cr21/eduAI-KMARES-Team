-- pgvector + bảng nhúng roadmap (RAG) + lộ trình AI do học sinh tạo
-- Bật extension vector trong Dashboard nếu chưa có quyền migration.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.roadmap_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS roadmap_embeddings_idx
  ON public.roadmap_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE TABLE IF NOT EXISTS public.custom_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  modules JSONB,
  total_duration_days INT,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  teacher_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_roadmaps_user_id_idx
  ON public.custom_roadmaps (user_id);

CREATE INDEX IF NOT EXISTS custom_roadmaps_status_idx
  ON public.custom_roadmaps (status);

-- RPC: tìm kiếm cosine (authenticated gọi qua API, không SELECT trực tiếp bảng nhúng)
CREATE OR REPLACE FUNCTION public.match_roadmap_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.content,
    e.metadata,
    (1 - (e.embedding <=> query_embedding))::double precision AS similarity
  FROM public.roadmap_embeddings e
  ORDER BY e.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.match_roadmap_embeddings(vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_roadmap_embeddings(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_roadmap_embeddings(vector, int) TO service_role;

ALTER TABLE public.roadmap_embeddings ENABLE ROW LEVEL SECURITY;
-- Không tạo policy cho authenticated/anon: chỉ service_role (bypass) + hàm SECURITY DEFINER đọc được.

ALTER TABLE public.custom_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own custom_roadmaps"
  ON public.custom_roadmaps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own custom_roadmaps"
  ON public.custom_roadmaps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom_roadmaps"
  ON public.custom_roadmaps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access custom_roadmaps"
  ON public.custom_roadmaps FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());
