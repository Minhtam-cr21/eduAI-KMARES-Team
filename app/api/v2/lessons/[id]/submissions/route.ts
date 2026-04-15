import {
  assertStudentEnrolledEduCourse,
  getEduCourseIdForLesson,
  getUserAndProfile,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { gradeEduQuizContent } from "@/lib/edu-v2/grade-quiz";
import { eduSubmissionCreateSchema } from "@/lib/validations/edu-v2";
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
    .from("edu_submissions")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: data ?? [] });
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
  const parsed = eduSubmissionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let score: number | null = null;
  let isCorrect: boolean | null = null;
  let feedback: string | null = null;

  if (parsed.data.submission_type === "quiz") {
    let contentData: Record<string, unknown> | null = null;

    if (parsed.data.lesson_content_id) {
      const { data: contentRow, error: qErr } = await supabase
        .from("edu_lesson_contents")
        .select("content_type, content_data")
        .eq("id", parsed.data.lesson_content_id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (qErr) return jsonError(qErr.message, 500);
      if (!contentRow || contentRow.content_type !== "quiz") {
        return jsonError("Invalid quiz content", 400);
      }
      contentData = contentRow.content_data as Record<string, unknown>;
    } else {
      const { data: rows, error: qErr } = await supabase
        .from("edu_lesson_contents")
        .select("content_data")
        .eq("lesson_id", lessonId)
        .eq("content_type", "quiz")
        .order("order", { ascending: true })
        .limit(1);
      if (qErr) return jsonError(qErr.message, 500);
      const first = rows?.[0];
      contentData = (first?.content_data as Record<string, unknown>) ?? null;
    }

    if (!contentData) {
      return jsonError("No quiz content for this lesson", 400);
    }

    const answers = parsed.data.answers as Record<string, unknown> | null;
    const graded = gradeEduQuizContent(contentData, answers);
    score = graded.score;
    isCorrect = graded.passed;
    feedback = graded.passed ? "Đạt" : `Chưa đạt (cần ≥ ${graded.passingScore}%)`;
  }

  const ins = {
    student_id: user.id,
    lesson_id: lessonId,
    submission_type: parsed.data.submission_type,
    submitted_code: parsed.data.submitted_code ?? null,
    answers: parsed.data.answers ?? null,
    score,
    feedback,
    is_correct: isCorrect,
    graded_at: parsed.data.submission_type === "quiz" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("edu_submissions")
    .insert(ins)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
