import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — giáo viên xem mọi bài học của khóa (mọi trạng thái). Khác GET /api/courses/[id]/lessons (chỉ published). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data: course, error: cErr } = await gate.supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", params.courseId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (course.teacher_id !== gate.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await gate.supabase
    .from("course_lessons")
    .select("*")
    .eq("course_id", params.courseId)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
