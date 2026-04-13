import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — yêu cầu kết nối gửi tới giáo viên, kèm tên học sinh (profiles). */
export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data: rows, error } = await gate.supabase
    .from("connection_requests")
    .select(
      "id, student_id, goal, available_time, status, created_at, responded_at, teacher_response"
    )
    .eq("teacher_id", gate.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const studentIds = Array.from(
    new Set(list.map((r) => r.student_id as string))
  );
  let names = new Map<string, string | null>();
  if (studentIds.length > 0) {
    const { data: profs } = await gate.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    for (const p of profs ?? []) {
      names.set(p.id as string, (p.full_name as string | null) ?? null);
    }
  }

  const enriched = list.map((r) => ({
    ...r,
    student_name: names.get(r.student_id as string) ?? null,
  }));

  return NextResponse.json(enriched);
}
