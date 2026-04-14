import type { SupabaseClient } from "@supabase/supabase-js";

export type TeacherCourseRow = {
  id: string;
  title: string;
  description: string | null;
  course_type: string;
  category: string;
  status: string | null;
  is_published: boolean | null;
  ai_generated: boolean | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  lesson_count: number;
};

export async function loadTeacherCoursesWithCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<TeacherCourseRow[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = courses ?? [];
  const ids = rows.map((c) => c.id as string);
  const counts = new Map<string, number>();
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
  }

  return rows.map((c) => {
    const row = c as Record<string, unknown>;
    return {
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      course_type: row.course_type as string,
      category: row.category as string,
      status: (row.status as string | null) ?? null,
      is_published: (row.is_published as boolean | null) ?? null,
      ai_generated: (row.ai_generated as boolean | null) ?? null,
      thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      lesson_count: counts.get(row.id as string) ?? 0,
    };
  });
}
