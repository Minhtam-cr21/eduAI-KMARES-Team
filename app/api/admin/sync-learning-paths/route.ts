import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { insertMissingLearningPathsForUser } from "@/lib/learning-path-insert";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sync-learning-paths — bổ sung lesson thiếu cho mọi học sinh (theo goal).
 * Dùng service role để ghi learning_paths cho student_id khác (RLS không cho phép user admin).
 */
export async function POST() {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  let db: ReturnType<typeof createServiceRoleClient>;
  try {
    db = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sync-learning-paths] service role client:", msg);
    return NextResponse.json(
      {
        error:
          "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server (Settings → API → service_role).",
        detail: msg,
      },
      { status: 503 }
    );
  }

  const { count: lessonsPublishedCount, error: lessonCountErr } = await db
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  if (lessonCountErr) {
    console.error("[sync-learning-paths] lesson count:", lessonCountErr.message);
    return NextResponse.json({ error: lessonCountErr.message }, { status: 500 });
  }

  const { data: students, error: listErr } = await db
    .from("profiles")
    .select("id, goal, hours_per_day, role")
    .eq("role", "student");

  if (listErr) {
    console.error("[sync-learning-paths] list students:", listErr.message);
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const list = students ?? [];
  let totalInserted = 0;
  const errors: { userId: string; message: string }[] = [];

  for (const row of list) {
    const hours =
      typeof row.hours_per_day === "number" && row.hours_per_day >= 1
        ? row.hours_per_day
        : 2;
    try {
      const { inserted } = await insertMissingLearningPathsForUser(db, {
        userId: row.id,
        profileGoal: row.goal,
        hoursPerDay: hours,
      });
      totalInserted += inserted;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[sync-learning-paths] user", row.id, message);
      if (errors.length < 20) {
        errors.push({ userId: row.id, message });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Đã thêm tổng ${totalInserted} bản ghi lộ trình.`,
    inserted: totalInserted,
    studentsProcessed: list.length,
    lessonsPublishedCount: lessonsPublishedCount ?? 0,
    errors: errors.length > 0 ? errors : undefined,
  });
}
