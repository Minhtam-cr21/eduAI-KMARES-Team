import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase.rpc(
    "teacher_list_students_with_stats"
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as TeacherStudentRow[];
  return NextResponse.json({ students: rows });
}
