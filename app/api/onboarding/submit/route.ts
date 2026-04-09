import { analyzeOnboardingAnswers } from "@/lib/onboarding/analyze";
import { onboardingQuestions } from "@/lib/onboarding/questions";
import { ensureEnrollmentAndSyncProgress } from "@/lib/user-courses/enroll-and-sync";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const basicInfoSchema = z.object({
  full_name: z.string().min(1),
  birth_year: z.coerce.number().int().min(1970).max(2015),
  school: z.string().optional().nullable(),
  class: z.string().optional().nullable(),
});

const answerSchema = z.object({
  code: z.string(),
  answer: z.string(),
});

const bodySchema = z.object({
  basicInfo: basicInfoSchema,
  answers: z.array(answerSchema),
});

function preferredLearningFromB1(b1: string | null): string | null {
  if (!b1) return null;
  if (b1 === "video" || b1 === "examples") return "Video";
  if (b1 === "text" || b1 === "practice") return "Text";
  return b1;
}

/** POST — hoàn tất onboarding, lưu câu trả lời, phân tích, gợi ý khóa + đồng bộ. */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { basicInfo, answers } = parsed.data;

  const requiredCodes = new Set(
    onboardingQuestions.filter((q) => q.required).map((q) => q.code)
  );
  const answerCodes = new Set(answers.map((a) => a.code));
  for (const code of Array.from(requiredCodes)) {
    if (!answerCodes.has(code)) {
      return NextResponse.json(
        { error: `Thiếu câu trả lời bắt buộc: ${code}` },
        { status: 400 }
      );
    }
  }

  const { error: delErr } = await supabase
    .from("onboarding_answers")
    .delete()
    .eq("user_id", user.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const rows = answers.map((a) => ({
    user_id: user.id,
    question_code: a.code,
    answer: a.answer,
  }));

  const { error: insAnsErr } = await supabase
    .from("onboarding_answers")
    .insert(rows);

  if (insAnsErr) {
    return NextResponse.json({ error: insAnsErr.message }, { status: 500 });
  }

  const analysis = await analyzeOnboardingAnswers(supabase, answers);

  const pl = preferredLearningFromB1(analysis.learning_style);

  const completedAt = new Date().toISOString();

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      full_name: basicInfo.full_name.trim(),
      birth_year: basicInfo.birth_year,
      school: basicInfo.school?.trim() || null,
      class: basicInfo.class?.trim() || null,
      goal: analysis.goal,
      hours_per_day: analysis.hours_per_day,
      preferred_learning: pl,
      learning_style: analysis.learning_style,
      mbti_type: analysis.mbti_type,
      preferred_pace: analysis.preferred_pace,
      challenge_level: analysis.challenge_level,
      reminder_method: analysis.reminder_method,
      onboarding_completed: true,
      onboarding_completed_at: completedAt,
    })
    .eq("id", user.id);

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const syncErrors: string[] = [];
  for (const courseId of analysis.suggested_course_ids) {
    const r = await ensureEnrollmentAndSyncProgress(user.id, courseId);
    if (!r.ok) {
      syncErrors.push(`${courseId}: ${r.error}`);
    }
  }

  return NextResponse.json({
    success: true,
    analysis,
    sync_errors: syncErrors.length ? syncErrors : undefined,
  });
}
