import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Danh sách custom_roadmaps (mặc định pending) của học sinh đã kết nối với GV. */
export async function GET(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const { data: rows, error } = await gate.supabase
    .from("custom_roadmaps")
    .select(
      "id, user_id, title, modules, total_duration_days, reasoning, status, teacher_feedback, created_at, updated_at"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const userIds = Array.from(new Set(list.map((r) => r.user_id as string)));
  let nameByUser = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profs } = await gate.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profs ?? []) {
      nameByUser.set(p.id as string, (p.full_name as string | null) ?? null);
    }
  }

  return NextResponse.json({
    roadmaps: list.map((r) => ({
      ...r,
      student_name: nameByUser.get(r.user_id as string) ?? null,
    })),
  });
}
