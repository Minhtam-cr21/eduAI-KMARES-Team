import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import type { CompletedAssessmentPendingStudent } from "@/lib/types/teacher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase.rpc(
    "teacher_students_completed_assessment_pending_path"
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const students = (data ?? []) as CompletedAssessmentPendingStudent[];
  return NextResponse.json({ students });
}
