import {
  assertStudentEnrolledEduCourse,
  getEduCourseIdForLesson,
  getUserAndProfile,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduProgressUpsertSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);

  const { courseId, error: cidErr } = await getEduCourseIdForLesson(supabase, lessonId);
  if (cidErr) return jsonError(cidErr, 500);
  if (!courseId) return jsonError("Not found", 404);

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
    .eq("lesson_id", lessonId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ progress: data });
}

export async function POST(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);

  const { courseId, error: cidErr } = await getEduCourseIdForLesson(supabase, lessonId);
  if (cidErr) return jsonError(cidErr, 500);
  if (!courseId) return jsonError("Not found", 404);

  const enroll = await assertStudentEnrolledEduCourse(
    supabase,
    courseId,
    user.id,
    profile
  );
  if (!enroll.ok) return enroll.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = eduProgressUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const markCompleted = parsed.data.mark_completed === true;
  const row = {
    student_id: user.id,
    course_id: courseId,
    lesson_id: lessonId,
    status: markCompleted
      ? "completed"
      : (parsed.data.status ?? "in_progress"),
    completion_percentage: markCompleted
      ? 100
      : (parsed.data.completion_percentage ?? undefined),
    time_spent_minutes: parsed.data.time_spent_minutes,
    last_accessed: now,
    completed_at: markCompleted ? now : undefined,
    updated_at: now,
  };

  const clean = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;

  const { data, error } = await supabase
    .from("edu_student_progress")
    .upsert(clean, { onConflict: "student_id,lesson_id" })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data);
}
