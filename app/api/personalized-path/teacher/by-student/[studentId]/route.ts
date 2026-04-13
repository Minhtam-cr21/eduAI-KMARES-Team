import { generatePathFromAssessment } from "@/lib/assessment/path-generator";
import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { studentId: string } };

/** GET — chi tiết lộ trình mới nhất của học sinh + gợi ý nếu chưa có. */
export async function GET(_request: Request, { params }: Ctx) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;
  const studentId = params.studentId;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const { data: path } = await supabase
    .from("personalized_paths")
    .select(
      "id, student_id, teacher_id, course_sequence, status, student_feedback, teacher_feedback, created_at, updated_at"
    )
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    path &&
    me?.role !== "admin" &&
    path.teacher_id != null &&
    path.teacher_id !== userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, category")
    .eq("status", "published")
    .order("title", { ascending: true });

  if (!path) {
    try {
      const { courseSequence, reasoning } = await generatePathFromAssessment(
        studentId,
        supabase
      );
      return NextResponse.json({
        path: null,
        suggested: { courseSequence, reasoning },
        courses: courses ?? [],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không tạo được gợi ý";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({
    path,
    suggested: null,
    courses: courses ?? [],
  });
}
