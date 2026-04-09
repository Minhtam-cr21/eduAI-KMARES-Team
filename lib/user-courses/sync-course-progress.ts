import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Xóa và tạo lại user_course_progress (bài published) cho user + course.
 * Dùng client có quyền (admin JWT hoặc service_role).
 */
export async function syncCourseProgress(
  db: SupabaseClient,
  userId: string,
  courseId: string
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const { error: delErr } = await db
    .from("user_course_progress")
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId);

  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  const { data: lessons, error: lErr } = await db
    .from("course_lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("order_index", { ascending: true });

  if (lErr) {
    return { ok: false, error: lErr.message };
  }

  const lessonList = lessons ?? [];
  if (lessonList.length === 0) {
    return { ok: true, created: 0 };
  }

  const inserts = lessonList.map((l) => ({
    user_id: userId,
    course_id: courseId,
    lesson_id: l.id as string,
    status: "pending" as const,
  }));

  const { error: insErr } = await db.from("user_course_progress").insert(inserts);

  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  return { ok: true, created: inserts.length };
}
