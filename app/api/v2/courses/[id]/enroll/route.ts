import { getUserAndProfile, isStudent, jsonError } from "@/lib/edu-v2/api-helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

/** Student enrolls in a published Edu V2 course. */
export async function POST(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isStudent(profile) && profile?.role !== "admin") {
    return jsonError("Only students can enroll", 403);
  }

  const { data: course, error: cErr } = await supabase
    .from("edu_courses")
    .select("id, is_published, is_archived")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) return jsonError(cErr.message, 500);
  if (!course) return jsonError("Not found", 404);
  const row = course as { is_published: boolean; is_archived: boolean };
  if (!row.is_published || row.is_archived) {
    return jsonError("Course is not open for enrollment", 403);
  }

  const { data: existing } = await supabase
    .from("edu_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ enrolled: true, message: "Already enrolled" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("edu_enrollments")
    .insert({ course_id: courseId, student_id: user.id })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
