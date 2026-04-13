import { analyzeAssessment } from "@/lib/assessment/analyzer";
import {
  ASSESSMENT_QUESTION_CODES,
  ASSESSMENT_QUESTIONS,
} from "@/lib/assessment/questions";
import { notifyAssessmentCompletedForStudent } from "@/lib/notifications/assessment-complete";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  answers: z.array(
    z.object({
      questionCode: z.string(),
      answer: z.string(),
    })
  ),
});

function validateAnswerValues(map: Record<string, string>): string | null {
  for (const q of ASSESSMENT_QUESTIONS) {
    const raw = map[q.code] ?? "";
    if (q.type === "checkbox" && q.options) {
      const parts = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allowed = new Set(q.options.map((o) => o.value));
      for (const p of parts) {
        if (!allowed.has(p)) return `Giá trị không hợp lệ tại ${q.code}`;
      }
      if (parts.includes("none") && parts.length > 1) {
        return "C1: chọn \"Chưa biết gì\" thì không chọn thêm mục khác.";
      }
      if (parts.length === 0) return `Thiếu lựa chọn: ${q.code}`;
      continue;
    }
    if (q.options) {
      const allowed = new Set(q.options.map((o) => o.value));
      if (!allowed.has(raw)) return `Giá trị không hợp lệ tại ${q.code}`;
    }
  }
  return null;
}

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

  const map: Record<string, string> = {};
  for (const row of parsed.data.answers) {
    map[row.questionCode] = row.answer.trim();
  }

  const uniqueCodes = new Set(parsed.data.answers.map((a) => a.questionCode));
  if (uniqueCodes.size !== ASSESSMENT_QUESTION_CODES.length) {
    return NextResponse.json(
      { error: "Danh sách câu trả lời có mã trùng hoặc thiếu." },
      { status: 400 }
    );
  }

  if (parsed.data.answers.length !== ASSESSMENT_QUESTION_CODES.length) {
    return NextResponse.json(
      {
        error: `Cần đúng ${ASSESSMENT_QUESTION_CODES.length} câu trả lời, nhận được ${parsed.data.answers.length}.`,
      },
      { status: 400 }
    );
  }

  for (const code of ASSESSMENT_QUESTION_CODES) {
    const v = map[code];
    if (v == null || v === "") {
      return NextResponse.json(
        { error: `Thiếu hoặc rỗng: ${code}` },
        { status: 400 }
      );
    }
  }

  const valueErr = validateAnswerValues(map);
  if (valueErr) {
    return NextResponse.json({ error: valueErr }, { status: 400 });
  }

  let analysis;
  try {
    analysis = await analyzeAssessment(map, supabase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: delRespErr } = await supabase
    .from("assessment_responses")
    .delete()
    .eq("user_id", user.id);
  if (delRespErr) {
    return NextResponse.json({ error: delRespErr.message }, { status: 500 });
  }

  const rows = ASSESSMENT_QUESTION_CODES.map((code) => ({
    user_id: user.id,
    question_code: code,
    answer: map[code]!,
  }));

  const { error: insRespErr } = await supabase
    .from("assessment_responses")
    .insert(rows);
  if (insRespErr) {
    return NextResponse.json({ error: insRespErr.message }, { status: 500 });
  }

  const { error: delCarErr } = await supabase
    .from("career_orientations")
    .delete()
    .eq("user_id", user.id);
  if (delCarErr) {
    await supabase.from("assessment_responses").delete().eq("user_id", user.id);
    return NextResponse.json({ error: delCarErr.message }, { status: 500 });
  }

  const { error: insCarErr } = await supabase.from("career_orientations").insert({
    user_id: user.id,
    mbti_type: analysis.mbti_type,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    suggested_careers: analysis.suggested_careers,
    suggested_courses:
      analysis.suggested_course_ids.length > 0
        ? analysis.suggested_course_ids
        : [],
  });
  if (insCarErr) {
    await supabase.from("assessment_responses").delete().eq("user_id", user.id);
    return NextResponse.json({ error: insCarErr.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      mbti_type: analysis.mbti_type,
      career_orientation: analysis.career_orientation_summary,
      assessment_completed: true,
      assessment_completed_at: now,
    })
    .eq("id", user.id);

  if (profErr) {
    await supabase.from("assessment_responses").delete().eq("user_id", user.id);
    await supabase.from("career_orientations").delete().eq("user_id", user.id);
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const { data: nameRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const fn = (nameRow?.full_name as string | null)?.trim();
  const studentDisplayName =
    fn ||
    (user.email ? user.email.split("@")[0]?.trim() : null) ||
    "Học sinh";

  void notifyAssessmentCompletedForStudent({
    studentId: user.id,
    studentDisplayName,
  });

  return NextResponse.json(analysis);
}
