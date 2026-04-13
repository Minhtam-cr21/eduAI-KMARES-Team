-- Bước 10: thêm trường yêu cầu kết nối + RPC khám phá giáo viên (SECURITY DEFINER, chỉ đọc).

ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS desired_roadmap TEXT;

COMMENT ON COLUMN public.connection_requests.reason IS 'Lý do học sinh muốn kết nối';
COMMENT ON COLUMN public.connection_requests.desired_roadmap IS 'Lộ trình / kỳ vọng mong muốn';

-- Danh sách giáo viên (phân trang, tìm kiếm tên, lọc category khóa đã publish).
CREATE OR REPLACE FUNCTION public.list_teachers_discovery(
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 12,
  p_search text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH matching AS (
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.role = 'teacher'
    AND (
      p_search IS NULL OR length(trim(p_search)) = 0
      OR p.full_name ILIKE '%' || trim(p_search) || '%'
    )
    AND (
      p_category IS NULL OR length(trim(p_category)) = 0
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.teacher_id = p.id
          AND c.status = 'published'
          AND lower(trim(c.category)) = lower(trim(p_category))
      )
    )
),
tot AS (SELECT COUNT(*)::int AS n FROM matching),
paged AS (
  SELECT m.id, m.full_name, m.avatar_url
  FROM matching m
  ORDER BY m.full_name NULLS LAST, m.id
  OFFSET GREATEST(0, p_offset)
  LIMIT LEAST(50, GREATEST(1, p_limit))
),
enriched AS (
  SELECT
    pe.id,
    pe.full_name,
    pe.avatar_url,
    CASE
      WHEN u.email IS NOT NULL THEN
        SUBSTRING(SPLIT_PART(u.email::text, '@', 1) FROM 1 FOR 2)
        || '***@'
        || SPLIT_PART(u.email::text, '@', 2)
    END AS email_masked,
    COALESCE(
      (
        SELECT array_agg(x.cat ORDER BY x.cat)
        FROM (
          SELECT DISTINCT trim(c.category) AS cat
          FROM public.courses c
          WHERE c.teacher_id = pe.id
            AND c.status = 'published'
            AND c.category IS NOT NULL
            AND length(trim(c.category)) > 0
        ) x
      ),
      ARRAY[]::text[]
    ) AS skills,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'title', s.title,
            'thumbnail_url', s.thumbnail_url
          )
          ORDER BY s.created_at DESC
        )
        FROM (
          SELECT c.id, c.title, c.thumbnail_url, c.created_at
          FROM public.courses c
          WHERE c.teacher_id = pe.id AND c.status = 'published'
          ORDER BY c.created_at DESC
          LIMIT 3
        ) s
      ),
      '[]'::jsonb
    ) AS featured_courses,
    (
      SELECT COUNT(DISTINCT cr.student_id)::bigint
      FROM public.connection_requests cr
      WHERE cr.teacher_id = pe.id
    ) AS total_students
  FROM paged pe
  LEFT JOIN auth.users u ON u.id = pe.id
)
SELECT jsonb_build_object(
  'total', (SELECT n FROM tot),
  'teachers', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'full_name', e.full_name,
          'avatar_url', e.avatar_url,
          'email_masked', e.email_masked,
          'skills', to_jsonb(e.skills),
          'featured_courses', e.featured_courses,
          'total_students', e.total_students
        )
        ORDER BY e.full_name NULLS LAST, e.id
      )
      FROM enriched e
    ),
    '[]'::jsonb
  ),
  'categories', COALESCE(
    (
      SELECT jsonb_agg(cat ORDER BY cat)
      FROM (
        SELECT DISTINCT trim(c.category) AS cat
        FROM public.courses c
        INNER JOIN public.profiles p ON p.id = c.teacher_id
        WHERE p.role = 'teacher'
          AND c.status = 'published'
          AND c.category IS NOT NULL
          AND length(trim(c.category)) > 0
      ) d
    ),
    '[]'::jsonb
  )
);
$$;

COMMENT ON FUNCTION public.list_teachers_discovery(int, int, text, text) IS
  'Học sinh/authenticated: danh sách giáo viên + skill/category, khóa nổi bật, email che.';

-- Chi tiết một giáo viên (trang profile).
CREATE OR REPLACE FUNCTION public.get_teacher_public_profile(p_teacher_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  CASE
    WHEN p.id IS NULL OR p.role <> 'teacher' THEN NULL::jsonb
    ELSE jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'email_masked',
      CASE
        WHEN u.email IS NOT NULL THEN
          SUBSTRING(SPLIT_PART(u.email::text, '@', 1) FROM 1 FOR 2)
          || '***@'
          || SPLIT_PART(u.email::text, '@', 2)
      END,
      'skills', COALESCE(
        (
          SELECT array_agg(x.cat ORDER BY x.cat)
          FROM (
            SELECT DISTINCT trim(c.category) AS cat
            FROM public.courses c
            WHERE c.teacher_id = p.id
              AND c.status = 'published'
              AND c.category IS NOT NULL
              AND length(trim(c.category)) > 0
          ) x
        ),
        ARRAY[]::text[]
      ),
      'published_courses', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'title', c.title,
              'description', c.description,
              'category', c.category,
              'course_type', c.course_type,
              'thumbnail_url', c.thumbnail_url,
              'created_at', c.created_at
            )
            ORDER BY c.created_at DESC
          )
          FROM public.courses c
          WHERE c.teacher_id = p.id AND c.status = 'published'
        ),
        '[]'::jsonb
      ),
      'total_students', (
        SELECT COUNT(DISTINCT cr.student_id)::bigint
        FROM public.connection_requests cr
        WHERE cr.teacher_id = p.id
      )
    )
  END
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.id = p_teacher_id;
$$;

COMMENT ON FUNCTION public.get_teacher_public_profile(uuid) IS
  'Chi tiết công khai một giáo viên (khóa publish + email che).';

GRANT EXECUTE ON FUNCTION public.list_teachers_discovery(int, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_public_profile(uuid) TO authenticated;
