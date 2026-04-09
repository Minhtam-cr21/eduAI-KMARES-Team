import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Letter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

const answerSchema = z.object({
  questionId: z.number().int().min(1).max(10),
  answer: z.enum(["A", "B"]),
});

const submitSchema = z
  .object({
    answers: z.array(answerSchema).length(10),
  })
  .refine(
    (body) => {
      const ids = body.answers.map((a) => a.questionId);
      return new Set(ids).size === 10 && ids.every((id) => id >= 1 && id <= 10);
    },
    { message: "Must include exactly one answer per question 1–10" }
  );

const RULES: Array<{ q: number; A: Letter; B: Letter }> = [
  { q: 1, A: "E", B: "I" },
  { q: 2, A: "E", B: "I" },
  { q: 3, A: "S", B: "N" },
  { q: 4, A: "S", B: "N" },
  { q: 5, A: "T", B: "F" },
  { q: 6, A: "T", B: "F" },
  { q: 7, A: "J", B: "P" },
  { q: 8, A: "J", B: "P" },
  { q: 9, A: "J", B: "P" },
  { q: 10, A: "J", B: "P" },
];

function computeMBTI(
  answers: z.infer<typeof submitSchema>["answers"]
): string {
  const scores: Record<Letter, number> = {
    E: 0,
    I: 0,
    S: 0,
    N: 0,
    T: 0,
    F: 0,
    J: 0,
    P: 0,
  };

  for (const ans of answers) {
    const rule = RULES.find((m) => m.q === ans.questionId);
    if (!rule) continue;
    const letter: Letter = ans.answer === "A" ? rule.A : rule.B;
    scores[letter] += 1;
  }

  return `${scores.E >= scores.I ? "E" : "I"}${scores.S >= scores.N ? "S" : "N"}${scores.T >= scores.F ? "T" : "F"}${scores.J >= scores.P ? "J" : "P"}`;
}

/** POST — nộp bài test MBTI, lưu kết quả + cập nhật profiles. */
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

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid answers", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const mbti_type = computeMBTI(parsed.data.answers);
  const now = new Date().toISOString();

  const { error: insertError } = await supabase.from("mbti_results").insert({
    user_id: user.id,
    mbti_type,
    test_date: now,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ mbti_type, mbti_last_test: now })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ mbti_type, test_date: now });
}
