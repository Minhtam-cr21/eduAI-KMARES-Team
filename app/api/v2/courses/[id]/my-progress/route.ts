import {
  assertStudentEnrolledEduCourse,
  getUserAndProfile,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

/** Current user's progress rows for all lessons in this Edu V2 course. */
export async function GET(_request: Request, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);

  const enroll = await assertStudentEnrolledEduCourse(
    supabase,
    courseId,
    user.id,
    profile
  );
  if (!enroll.ok) return enroll.response;

  const { data, error } = await supabase
    .from("edu_student_progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("student_id", user.id);

  if (error) return jsonError(error.message, 500);
  const byLesson: Record<string, (typeof data)[number]> = {};
  for (const row of data ?? []) {
    byLesson[row.lesson_id as string] = row;
  }
  return NextResponse.json({ byLesson });
}
