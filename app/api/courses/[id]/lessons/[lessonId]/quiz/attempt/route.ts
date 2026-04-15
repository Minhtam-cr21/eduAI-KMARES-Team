import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const attemptBodySchema = z.object({
  answers: z.array(z.string()),
  quiz_id: z.string().uuid().optional(),
});

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export async function POST(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = attemptBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: enroll } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enroll) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let quizQuery = supabase
    .from("quizzes")
    .select("id, questions, passing_score, is_published")
    .eq("lesson_id", lessonId)
    .eq("is_published", true);

  if (parsed.data.quiz_id) {
    quizQuery = quizQuery.eq("id", parsed.data.quiz_id);
  }

  const { data: quiz, error: qErr } = await quizQuery.maybeSingle();
  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const questions = quiz.questions as QuizQuestion[];
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "Invalid quiz data" }, { status: 500 });
  }

  if (parsed.data.answers.length !== questions.length) {
    return NextResponse.json(
      { error: `Expected ${questions.length} answers` },
      { status: 400 }
    );
  }

  const details: {
    index: number;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }[] = [];

  let correctCount = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const userAns = parsed.data.answers[i] ?? "";
    const ok = userAns === q.correctAnswer;
    if (ok) correctCount++;
    details.push({
      index: i,
      correct: ok,
      userAnswer: userAns,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    });
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (quiz.passing_score ?? 70);

  const now = new Date().toISOString();
  const { data: attempt, error: aErr } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quiz.id,
      score,
      answers: { answers: parsed.data.answers, details },
      started_at: now,
      completed_at: now,
    })
    .select("id, score")
    .single();

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  return NextResponse.json({
    attempt_id: attempt.id,
    score,
    passed,
    passing_score: quiz.passing_score ?? 70,
    details,
  });
}
