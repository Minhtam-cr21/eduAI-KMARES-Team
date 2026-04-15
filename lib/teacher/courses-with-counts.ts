import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
} | null;

export type TeacherCourseRow = {
  id: string;
  title: string;
  description: string | null;
  course_type: string;
  category: string;
  category_id: string | null;
  catalog_category: CatalogCategory;
  status: string | null;
  is_published: boolean | null;
  ai_generated: boolean | null;
  thumbnail_url: string | null;
  image_url: string | null;
  promo_video_url: string | null;
  price: number | null;
  duration_hours: number | null;
  level: string | null;
  objectives: string[] | null;
  target_audience: string | null;
  recommendations: string | null;
  what_you_will_learn: string[] | null;
  requirements: string[] | null;
  highlights: string[] | null;
  outcomes_after: string[] | null;
  faq: unknown | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  lesson_count: number;
  chapter_count: number;
};

export async function loadTeacherCoursesWithCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<TeacherCourseRow[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*, course_categories ( id, name, slug )")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = courses ?? [];
  const ids = rows.map((c) => c.id as string);
  const counts = new Map<string, number>();
  const chapterCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: les, error: lErr } = await supabase
      .from("course_lessons")
      .select("course_id")
      .in("course_id", ids);
    if (lErr) throw new Error(lErr.message);
    for (const l of les ?? []) {
      const cid = l.course_id as string;
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
    const { data: chRows, error: chErr } = await supabase
      .from("course_chapters")
      .select("course_id")
      .in("course_id", ids);
    if (chErr) throw new Error(chErr.message);
    for (const c of chRows ?? []) {
      const cid = c.course_id as string;
      chapterCounts.set(cid, (chapterCounts.get(cid) ?? 0) + 1);
    }
  }

  return rows.map((c) => {
    const row = c as Record<string, unknown>;
    const cc = row.course_categories as CatalogCategory;
    return {
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      course_type: row.course_type as string,
      category: row.category as string,
      category_id: (row.category_id as string | null) ?? null,
      catalog_category: cc,
      status: (row.status as string | null) ?? null,
      is_published: (row.is_published as boolean | null) ?? null,
      ai_generated: (row.ai_generated as boolean | null) ?? null,
      thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      promo_video_url: (row.promo_video_url as string | null) ?? null,
      price: (row.price as number | null) ?? null,
      duration_hours: (row.duration_hours as number | null) ?? null,
      level: (row.level as string | null) ?? null,
      objectives: (row.objectives as string[] | null) ?? null,
      target_audience: (row.target_audience as string | null) ?? null,
      recommendations: (row.recommendations as string | null) ?? null,
      what_you_will_learn: (row.what_you_will_learn as string[] | null) ?? null,
      requirements: (row.requirements as string[] | null) ?? null,
      highlights: (row.highlights as string[] | null) ?? null,
      outcomes_after: (row.outcomes_after as string[] | null) ?? null,
      faq: row.faq ?? null,
      content: (row.content as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      lesson_count: counts.get(row.id as string) ?? 0,
      chapter_count: chapterCounts.get(row.id as string) ?? 0,
    };
  });
}
