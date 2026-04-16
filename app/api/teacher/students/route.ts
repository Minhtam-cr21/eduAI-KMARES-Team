import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { loadTeacherStudentsList } from "@/lib/teacher/students";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  // TODO(master-plan-v2 phase 3): This roster currently returns all students
  // for teacher/admin. Keep behavior unchanged for now. Completed-assessment
  // and study-schedule flows are narrower (connection/path scoped), so product
  // must confirm whether the long-term rule is "all students" or "connected only".
  const { data, error } = await loadTeacherStudentsList(gate.supabase);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ students: data });
}
