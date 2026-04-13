import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { computeMBTI, computeTraits, type TraitScores } from "./analyzer";

export type CourseSequenceItem = {
  course_id: string;
  order_index: number;
  recommended_due_date_offset_days: number;
};

const openAiResponseSchema = z.object({
  course_ids: z.array(z.string().uuid()),
  reasoning: z.string(),
});

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type PublishedCourse = { id: string; category: string };

function normalizeGoalFromA1(answers: Record<string, string>): string {
  return (answers.A1 ?? "").trim().toLowerCase() || "other";
}

const RULE_ORDER: Record<string, string[]> = {
  web: ["Frontend", "Backend", "Fullstack", "SQL"],
  data: ["SQL", "Backend", "Python", "Prompt engineering"],
  game: ["C++", "Frontend", "Backend"],
  mobile: ["Frontend", "Fullstack", "Backend"],
  automation: ["Backend", "Python", "Prompt engineering"],
  other: ["Frontend", "SQL", "Backend"],
};

function uniq(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Gợi ý thứ tự khóa theo mục tiêu (A1) và category đã publish.
 */
function ruleBasedCourseOrder(
  courses: PublishedCourse[],
  goalKey: string,
  suggestedFromOrientation: string[]
): string[] {
  const byCat = new Map<string, PublishedCourse[]>();
  for (const c of courses) {
    const k = (c.category ?? "").trim().toLowerCase();
    if (!k) continue;
    const list = byCat.get(k) ?? [];
    list.push(c);
    byCat.set(k, list);
  }

  const pickFromCategory = (label: string): string[] => {
    const key = label.trim().toLowerCase();
    const list = byCat.get(key);
    if (!list?.length) return [];
    return list.map((x) => x.id);
  };

  const orderLabels = RULE_ORDER[goalKey] ?? RULE_ORDER.other;
  const out: string[] = [];

  for (const id of suggestedFromOrientation) {
    if (courses.some((c) => c.id === id)) out.push(id);
  }

  for (const label of orderLabels) {
    out.push(...pickFromCategory(label));
  }

  for (const c of courses) {
    if (!out.includes(c.id)) out.push(c.id);
  }

  return uniq(out);
}

function buildSequenceFromIds(
  orderedIds: string[],
  daysPerCourse = 7
): CourseSequenceItem[] {
  let cumulative = 0;
  return orderedIds.map((course_id, i) => {
    cumulative += daysPerCourse;
    return {
      course_id,
      order_index: i,
      recommended_due_date_offset_days: cumulative,
    };
  });
}

async function loadAssessmentAnswers(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("assessment_responses")
    .select("question_code, answer")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const code = row.question_code as string;
    map[code] = String(row.answer ?? "");
  }
  return map;
}

async function callOpenAiPathSuggestion(args: {
  mbti: string;
  goal: string;
  traits: TraitScores;
  courseCatalog: { id: string; category: string; title: string }[];
}): Promise<{ course_ids: string[]; reasoning: string } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-3.5-turbo";
  const allowed = new Set(args.courseCatalog.map((c) => c.id));

  const userPrompt = [
    `Dựa trên MBTI = ${args.mbti}, mục tiêu (A1) = ${args.goal}, điểm các trụ cột = ${JSON.stringify(args.traits)}, hãy đề xuất danh sách khóa học (từ các category: C++, Java, SQL, Frontend, Backend, Fullstack, Prompt engineering, Python, Vibe Coding) theo thứ tự nên học.`,
    "Chỉ được chọn course_id từ catalog sau (id + category + title):",
    JSON.stringify(args.courseCatalog),
    'Trả về DUY NHẤT JSON: {"course_ids":["uuid",...],"reasoning":"lý do ngắn tiếng Việt"} — mọi id phải nằm trong catalog.',
  ].join("\n");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Bạn là cố vấn lộ trình học lập trình. Chỉ trả về JSON hợp lệ, không markdown.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[path-generator] OpenAI error:", res.status, text.slice(0, 200));
    return null;
  }

  const data = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }

  const parsed = openAiResponseSchema.safeParse(raw);
  if (!parsed.success) return null;

  const filtered = parsed.data.course_ids.filter((id) => allowed.has(id));
  if (filtered.length === 0) return null;

  return {
    course_ids: uniq(filtered),
    reasoning: parsed.data.reasoning,
  };
}

/**
 * Sinh course_sequence (thứ tự + offset ngày tích luỹ) từ kết quả test + career_orientations.
 */
export async function generatePathFromAssessment(
  userId: string,
  supabase: SupabaseClient
): Promise<{ courseSequence: CourseSequenceItem[]; reasoning: string }> {
  const [{ data: profile, error: pErr }, { data: orientation, error: oErr }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("goal, mbti_type")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("career_orientations")
        .select("suggested_courses, mbti_type")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (pErr) throw new Error(pErr.message);
  if (oErr) throw new Error(oErr.message);

  const answers = await loadAssessmentAnswers(supabase, userId);
  const mbti =
    (orientation?.mbti_type as string | null)?.trim() ||
    (profile?.mbti_type as string | null)?.trim() ||
    computeMBTI(answers);
  const traits = computeTraits(answers);
  const goalKey = normalizeGoalFromA1(answers);
  const goalDisplay = profile?.goal?.trim() || answers.A1 || goalKey;

  const suggestedRaw = orientation?.suggested_courses;
  const suggestedFromOrientation: string[] = [];
  if (Array.isArray(suggestedRaw)) {
    for (const x of suggestedRaw) {
      if (typeof x === "string" && z.string().uuid().safeParse(x).success) {
        suggestedFromOrientation.push(x);
      }
    }
  }

  const { data: published, error: cErr } = await supabase
    .from("courses")
    .select("id, category, title")
    .eq("status", "published");

  if (cErr) throw new Error(cErr.message);
  const courses = (published ?? []) as PublishedCourse[];

  const catalog = courses.map((c) => ({
    id: c.id,
    category: c.category,
    title: (c as { title?: string }).title ?? "",
  }));

  let orderedIds: string[] = [];
  let reasoning = "";

  const ai = await callOpenAiPathSuggestion({
    mbti,
    goal: String(goalDisplay),
    traits,
    courseCatalog: catalog,
  });

  if (ai) {
    orderedIds = ai.course_ids;
    reasoning = ai.reasoning;
  } else {
    orderedIds = ruleBasedCourseOrder(courses, goalKey, suggestedFromOrientation);
    reasoning =
      `Gợi ý theo luật (không gọi AI hoặc AI lỗi): mục tiêu "${goalKey}", MBTI ${mbti}, ưu tiên khóa đã gợi ý trong career_orientations và thứ tự category phù hợp.`;
  }

  const validIds = orderedIds.filter((id) => courses.some((c) => c.id === id));
  const courseSequence = buildSequenceFromIds(validIds);

  return { courseSequence, reasoning };
}
