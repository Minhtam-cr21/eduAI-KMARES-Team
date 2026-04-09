import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { loadTeacherDashboardStats } from "@/lib/teacher/dashboard-stats";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  try {
    const stats = await loadTeacherDashboardStats(
      gate.supabase,
      gate.userId
    );
    return NextResponse.json(stats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
