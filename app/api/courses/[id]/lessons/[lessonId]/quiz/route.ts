import { lessonQuizUpsertSchema } from "@/lib/validations/lesson-quiz";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function assertCanEditCourse(
  supabase: ReturnType<typeof createClient>,
  courseId: string,
  userId: string
) {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) return { error: pErr.message, status: 500 as const };

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) return { error: cErr.message, status: 500 as const };
  if (!course) return { error: "Not found", status: 404 as const };

  if (profile?.role === "admin") return { ok: true as const };
  if (profile?.role === "teacher" && course.teacher_id === userId) {
    return { ok: true as const };
  }
  return { error: "Forbidden", status: 403 as const };
}

async function assertLessonInCourse(
  supabase: ReturnType<typeof createClient>,
  courseId: string,
  lessonId: string
) {
  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .select("id, course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  if (!lesson || lesson.course_id !== courseId) {
    return { error: "Lesson not in course", status: 404 as const };
  }
  return { lesson };
}

/** GET — quiz for lesson (teacher/admin always; student if published + enrolled). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = params.id;
  const lessonId = params.lessonId;

  const lg = await assertLessonInCourse(supabase, courseId, lessonId);
  if ("error" in lg) {
    return NextResponse.json({ error: lg.error }, { status: lg.status });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isStaff = profile?.role === "teacher" || profile?.role === "admin";

  if (isStaff) {
    const gate = await assertCanEditCourse(supabase, courseId, user.id);
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
  } else {
    const { data: enroll } = await supabase
      .from("user_courses")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (!enroll) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, course_id, lesson_id, questions, time_limit, passing_score, is_published, created_at"
    )
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  if (!quiz) {
    return NextResponse.json({ quiz: null });
  }

  if (!isStaff && !quiz.is_published) {
    return NextResponse.json({ quiz: null });
  }

  if (!isStaff) {
    type Q = { question: string; options: string[]; correctAnswer?: string; explanation?: string };
    const raw = quiz.questions as Q[];
    const safeQuestions = Array.isArray(raw)
      ? raw.map(({ question, options }) => ({ question, options }))
      : [];
    return NextResponse.json({
      quiz: {
        ...quiz,
        questions: safeQuestions,
      },
    });
  }

  return NextResponse.json({ quiz });
}

/** PUT — upsert quiz for lesson (teacher owner or admin). */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = params.id;
  const lessonId = params.lessonId;

  const gate = await assertCanEditCourse(supabase, courseId, user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const lg = await assertLessonInCourse(supabase, courseId, lessonId);
  if ("error" in lg) {
    return NextResponse.json({ error: lg.error }, { status: lg.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = lessonQuizUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  for (const q of d.questions) {
    if (!q.options.includes(q.correctAnswer)) {
      return NextResponse.json(
        { error: `correctAnswer must be one of options: ${q.question.slice(0, 40)}…` },
        { status: 400 }
      );
    }
  }

  const row = {
    title: d.title,
    description: d.description?.trim() || null,
    course_id: courseId,
    lesson_id: lessonId,
    questions: d.questions,
    time_limit: d.time_limit ?? null,
    passing_score: d.passing_score ?? 70,
    created_by: user.id,
    is_published: d.is_published ?? true,
  };

  const { data: existing } = await supabase
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (existing?.id) {
    const { data: updated, error: upErr } = await supabase
      .from("quizzes")
      .update(row)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ quiz: { id: updated.id } });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("quizzes")
    .insert(row)
    .select("id")
    .single();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ quiz: { id: inserted.id } });
}

/** DELETE — remove quiz for lesson (teacher owner or admin). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = params.id;
  const lessonId = params.lessonId;

  const gate = await assertCanEditCourse(supabase, courseId, user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const lg = await assertLessonInCourse(supabase, courseId, lessonId);
  if ("error" in lg) {
    return NextResponse.json({ error: lg.error }, { status: lg.status });
  }

  const { error } = await supabase.from("quizzes").delete().eq("lesson_id", lessonId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
