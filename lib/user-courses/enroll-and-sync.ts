import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { syncCourseProgress } from "@/lib/user-courses/sync-course-progress";

/**
 * Đảm bảo có user_courses (active) và đồng bộ progress — dùng service role.
 */
export async function ensureEnrollmentAndSyncProgress(
  userId: string,
  courseId: string
): Promise<
  { ok: true; created: number } | { ok: false; error: string }
> {
  let db: ReturnType<typeof createServiceRoleClient>;
  try {
    db = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  const { data: existing } = await db
    .from("user_courses")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await db.from("user_courses").insert({
      user_id: userId,
      course_id: courseId,
      status: "active",
    });
    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  const sync = await syncCourseProgress(db, userId, courseId);
  if (!sync.ok) {
    return sync;
  }
  return { ok: true, created: sync.created };
}
