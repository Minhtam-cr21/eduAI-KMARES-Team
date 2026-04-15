import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
});

const quizDataSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
  time_limit: z.coerce.number().int().min(1).max(600).optional(),
  passing_score: z.coerce.number().int().min(0).max(100).optional(),
});

const createLessonSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  code_template: z.string().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
  chapter_id: z.string().uuid().nullable().optional(),
  type: z.enum(["text", "video", "quiz"]).optional(),
  quizData: quizDataSchema.optional(),
  status: z.enum(["pending", "published", "rejected", "draft"]).optional(),
});

function sanitizeQuizQuestions(
  raw: z.infer<typeof quizDataSchema>["questions"]
): { question: string; options: string[]; correctAnswer: string; explanation: string }[] {
  const out: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[] = [];
  for (const r of raw) {
    const q = String(r.question ?? "").trim();
    if (!q) continue;
    const opts = r.options.map((x) => String(x).trim()).filter(Boolean);
    if (opts.length < 2) continue;
    const correct = String(r.correctAnswer ?? "").trim();
    if (!correct || !opts.includes(correct)) continue;
    out.push({
      question: q,
      options: opts,
      correctAnswer: correct,
      explanation: String(r.explanation ?? "").trim(),
    });
  }
  return out;
}

/** POST — teacher adds a lesson to their own course. Quiz lessons (quizData) are saved as draft + linked quiz. */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    course_id,
    title,
    content,
    video_url,
    code_template,
    order_index,
    chapter_id,
    type: typeIn,
    quizData,
    status: statusIn,
  } = parsed.data;

  const type =
    quizData != null ? "quiz" : typeIn ?? "text";

  if (quizData != null && type !== "quiz") {
    return NextResponse.json(
      { error: "quizData chỉ dùng khi type là quiz" },
      { status: 400 }
    );
  }

  const status =
    quizData != null ? (statusIn ?? "draft") : (statusIn ?? "published");

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("teacher_id, status, is_published")
    .eq("id", course_id)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course || course.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only add lessons to your own courses" },
      { status: 403 }
    );
  }
  const c = course as { is_published?: boolean | null; status?: string };

  const allowDraftOrPending =
    status === "draft" || status === "pending";

  if (!allowDraftOrPending && c.is_published === false) {
    return NextResponse.json(
      {
        error:
          "Course is unpublished — publish the course first or enable visibility.",
      },
      { status: 400 }
    );
  }

  let questionsJson: unknown = null;
  if (quizData) {
    questionsJson = sanitizeQuizQuestions(quizData.questions);
    if (!Array.isArray(questionsJson) || questionsJson.length === 0) {
      return NextResponse.json(
        {
          error:
            "Dữ liệu quiz không hợp lệ: cần ít nhất một câu có đủ lựa chọn và đáp án đúng.",
        },
        { status: 400 }
      );
    }
  }

  const lessonRow = {
    course_id,
    chapter_id: chapter_id ?? null,
    title,
    type,
    content: content ?? null,
    video_url: video_url ?? null,
    code_template: code_template ?? null,
    order_index: order_index ?? 0,
    status,
    created_by: user.id,
  };

  const { data: insertedLesson, error } = await supabase
    .from("course_lessons")
    .insert(lessonRow)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (quizData && questionsJson && insertedLesson?.id) {
    const time_limit = quizData.time_limit ?? 20;
    const passing_score = quizData.passing_score ?? 70;
    const { error: qErr } = await supabase.from("quizzes").insert({
      title: `Quiz: ${title}`,
      description: (content as string | null)?.trim() || null,
      course_id,
      lesson_id: insertedLesson.id as string,
      questions: questionsJson,
      time_limit,
      passing_score,
      created_by: user.id,
      is_published: false,
    });
    if (qErr) {
      await supabase.from("course_lessons").delete().eq("id", insertedLesson.id);
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(insertedLesson, { status: 201 });
}
