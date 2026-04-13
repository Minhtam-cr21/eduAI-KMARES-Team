import type { SupabaseClient } from "@supabase/supabase-js";

import { ASSESSMENT_QUESTIONS } from "./questions";

type Axis = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

const MBTI_MAPPINGS: Array<{ code: string; map: Record<string, Axis> }> = [
  { code: "MBTI_1", map: { E: "E", I: "I" } },
  { code: "MBTI_2", map: { E: "E", I: "I" } },
  { code: "MBTI_3", map: { S: "S", N: "N" } },
  { code: "MBTI_4", map: { S: "S", N: "N" } },
  { code: "MBTI_5", map: { T: "T", F: "F" } },
  { code: "MBTI_6", map: { T: "T", F: "F" } },
  { code: "MBTI_7", map: { J: "J", P: "P" } },
  { code: "MBTI_8", map: { J: "J", P: "P" } },
  { code: "MBTI_9", map: { J: "J", P: "P" } },
  { code: "MBTI_10", map: { J: "J", P: "P" } },
  { code: "MBTI_11", map: { E: "E", I: "I" } },
  { code: "MBTI_12", map: { E: "E", I: "I" } },
  { code: "MBTI_13", map: { S: "S", N: "N" } },
  { code: "MBTI_14", map: { S: "S", N: "N" } },
  { code: "MBTI_15", map: { T: "T", F: "F" } },
  { code: "MBTI_16", map: { T: "T", F: "F" } },
  { code: "MBTI_17", map: { J: "J", P: "P" } },
  { code: "MBTI_18", map: { J: "J", P: "P" } },
  { code: "MBTI_19", map: { J: "J", P: "P" } },
  { code: "MBTI_20", map: { J: "J", P: "P" } },
];

const MBTI_CAREER_BASE: Record<string, string[]> = {
  INTJ: ["Kiến trúc sư phần mềm", "Data Scientist", "Kỹ sư hệ thống", "Product strategy", "An ninh thông tin"],
  INTP: ["Nghiên cứu AI", "Backend engineer", "Kỹ sư công cụ", "Technical writer", "Game systems"],
  ENTJ: ["Quản lý sản phẩm", "Tech lead", "Founder", "Quản lý dự án", "Sales kỹ thuật"],
  ENTP: ["Fullstack / startup", "DevRel", "Giải pháp doanh nghiệp", "UX researcher", "Automation"],
  INFJ: ["UX/UI có tâm lý", "Giáo dục công nghệ", "Content / community", "Counseling tech", "Healthcare IT"],
  INFP: ["Frontend sáng tạo", "Game narrative", "Thiết kế tương tác", "Marketing kỹ thuật", "Open source"],
  ENFJ: ["Scrum master", "People manager", "Customer success", "Đào tạo nội bộ", "EdTech"],
  ENFP: ["Growth / marketing", "Product owner", "Creative technologist", "Startup generalist", "Evangelist"],
  ISTJ: ["DevOps", "QA engineer", "Database admin", "Kế toán / ERP", "Compliance tech"],
  ISFJ: ["Hỗ trợ kỹ thuật", "QA manual", "Healthcare systems", "Internal tools", "Technical support"],
  ESTJ: ["Engineering manager", "IT operations", "Implementation consultant", "Release manager", "Admin hệ thống"],
  ESFJ: ["Customer support lead", "Training specialist", "HR tech", "Account manager", "Team coordinator"],
  ISTP: ["SRE", "Embedded / IoT", "Security pentester", "Gameplay programmer", "Kỹ thuật phần cứng"],
  ISFP: ["UI implementation", "Motion / web creative", "Indie dev", "AR/VR content", "Sound tech"],
  ESTP: ["Sales engineer", "Field application", "Mobile rapid delivery", "Incident response", "Solutions architect"],
  ESFP: ["Demo specialist", "Livestream tech", "Event tech", "Mobile apps consumer", "Creative production"],
};

export type TraitScores = {
  motivation: number;
  learningStyle: number;
  foundationSkills: number;
  interests: number;
};

export type AssessmentAnalysis = {
  mbti_type: string;
  traits: TraitScores;
  strengths: string[];
  weaknesses: string[];
  suggested_careers: string[];
  suggested_course_ids: string[];
  career_orientation_summary: string;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function computeMBTI(answers: Record<string, string>): string {
  const counts: Record<Axis, number> = {
    E: 0,
    I: 0,
    S: 0,
    N: 0,
    T: 0,
    F: 0,
    J: 0,
    P: 0,
  };

  for (const { code, map } of MBTI_MAPPINGS) {
    const raw = answers[code]?.trim();
    if (!raw) continue;
    const axis = map[raw];
    if (axis) counts[axis] += 1;
  }

  const eOrI = counts.E >= counts.I ? "E" : "I";
  const sOrN = counts.S >= counts.N ? "S" : "N";
  const tOrF = counts.T >= counts.F ? "T" : "F";
  const jOrP = counts.J >= counts.P ? "J" : "P";

  return `${eOrI}${sOrN}${tOrF}${jOrP}`;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeTraits(answers: Record<string, string>): TraitScores {
  const scoreMap: Record<string, number> = {};

  const put = (code: string, weights: Record<string, number>) => {
    const v = answers[code]?.trim();
    if (v) scoreMap[code] = weights[v] ?? 50;
  };

  put("A1", { web: 72, data: 78, game: 70, mobile: 74, automation: 76, other: 55 });
  put("A2", { web_basic: 65, data_analysis: 80, simple_game: 68, mobile_app: 72, automation: 75 });
  put("A3", { "<1": 35, "1-2": 55, "2-4": 75, ">4": 95 });
  put("A4", { never: 40, self_video: 55, one_course: 65, small_project: 80 });
  put("A5", { startup: 88, corp: 60, freelance: 70, research: 82, teach: 75 });
  put("A6", { low: 40, medium: 55, high: 75, very_high: 90 });

  const aScores = ["A1", "A2", "A3", "A4", "A5", "A6"].map((c) => scoreMap[c] ?? 50);

  put("B1", { video: 60, text: 55, practice: 85, examples: 70 });
  put("B2", { google: 70, friend: 60, ai: 65, review: 72 });
  put("B3", { very: 70, maybe: 60, no: 45, self: 75 });
  put("B4", { easy: 40, medium: 60, challenge: 78, very_hard: 88 });
  put("B5", { very: 72, sometimes: 60, no: 45, alone: 50 });
  put("B6", { email: 55, telegram: 60, none: 40, inapp: 65 });
  put("B7", { morning: 60, afternoon: 60, evening: 65, night: 55 });
  put("B8", { depth: 78, breadth: 62 });

  const bScores = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"].map((c) => scoreMap[c] ?? 50);

  const c1 = answers.C1?.trim() ?? "";
  const c1Parts = c1 ? c1.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techCount = c1Parts.filter((p) => p !== "none").length;
  const foundationFromC1 = c1Parts.includes("none") ? 25 : clamp(30 + techCount * 14, 0, 100);

  put("C2", { no: 35, basic: 60, proficient: 88 });
  put("C3", { bad: 35, dictionary: 50, basic: 65, good: 90 });
  put("C4", { very_hard: 40, sometimes: 55, quite: 72, very: 88 });
  put("C5", { ai_do: 45, ai_suggest: 60, self: 85, ask: 55 });
  put("C6", { none: 30, basic: 50, sql_ok: 72, advanced: 92 });
  put("C7", { weak: 40, medium: 58, strong: 78, very_strong: 92 });
  put("C8", { never: 35, small: 58, several: 75, production: 92 });

  const cScores = [
    foundationFromC1,
    ...["C2", "C3", "C4", "C5", "C6", "C7", "C8"].map((c) => scoreMap[c] ?? 50),
  ];

  put("D1", { game: 72, website: 75, mobile: 74, automation: 70, data: 85, other: 55 });
  put("D2", { art: 65, music: 62, sports: 55, science: 80, business: 72, cooking: 50, travel: 55 });
  put("D3", {
    environment: 70,
    education: 78,
    health: 72,
    traffic: 65,
    security: 82,
    other: 55,
  });
  put("D4", { very: 88, normal: 55, no: 35 });
  put("D5", { en: 70, zh: 60, jp: 60, kr: 58, none: 45 });
  put("D6", { remote: 68, onsite: 55, hybrid: 72 });
  put("D7", { low: 40, medium: 58, high: 85 });
  put("D8", { b2c: 72, b2b: 70, internal: 58, research: 82 });

  const dScores = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"].map((c) => scoreMap[c] ?? 50);

  return {
    motivation: clamp(avg(aScores)),
    learningStyle: clamp(avg(bScores)),
    foundationSkills: clamp(avg(cScores)),
    interests: clamp(avg(dScores)),
  };
}

export function suggestCareers(mbti: string, traits: TraitScores): string[] {
  const base = MBTI_CAREER_BASE[mbti] ?? [
    "Lập trình viên fullstack",
    "Kỹ sư phần mềm",
    "Chuyên viên phân tích dữ liệu",
    "QA / automation",
    "DevOps",
  ];
  const extra: string[] = [];
  if (traits.interests >= 75 && !base.some((b) => b.includes("AI")))
    extra.push("AI / ML engineer (mở rộng)");
  if (traits.foundationSkills >= 80) extra.push("System design / kiến trúc");
  if (traits.motivation >= 80) extra.push("Technical founder / indie hacker");
  return Array.from(new Set([...base.slice(0, 4), ...extra])).slice(0, 8);
}

const CATEGORY_KEYWORDS: { cat: string; terms: string[] }[] = [
  { cat: "SQL", terms: ["data", "sql", "backend", "b2b", "analytics"] },
  { cat: "Frontend", terms: ["web", "website", "frontend", "ui", "b2c"] },
  { cat: "Backend", terms: ["backend", "api", "b2b", "automation", "corp"] },
  { cat: "Fullstack", terms: ["fullstack", "startup", "mobile", "founder"] },
  { cat: "Prompt engineering", terms: ["ai", "prompt", "ml", "research"] },
  { cat: "C++", terms: ["game", "embedded", "performance", "challenge", "very_hard"] },
  { cat: "Vibe Coding", terms: ["creative", "rapid", "prototype", "entp", "enfp"] },
];

function collectPreferenceTokens(answers: Record<string, string>): Set<string> {
  const tokens = new Set<string>();
  for (const [code, raw] of Object.entries(answers)) {
    if (code.startsWith("MBTI_")) continue;
    const v = raw.trim().toLowerCase();
    if (!v) continue;
    for (const part of v.split(",")) {
      const p = part.trim();
      if (p) tokens.add(p);
    }
  }
  return tokens;
}

export async function suggestCourses(
  supabase: SupabaseClient,
  mbti: string,
  traits: TraitScores,
  answers: Record<string, string>
): Promise<string[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, category")
    .eq("status", "published");

  if (error || !courses?.length) return [];

  const tokens = collectPreferenceTokens(answers);
  tokens.add(mbti.toLowerCase());

  const scored = courses.map((c) => {
    const cat = (c.category ?? "").trim();
    let score = 0;
    for (const row of CATEGORY_KEYWORDS) {
      if (row.cat.toLowerCase() === cat.toLowerCase()) {
        for (const t of row.terms) {
          if (tokens.has(t)) score += 3;
        }
      }
    }
    if (traits.foundationSkills < 50 && cat === "C++") score += 2;
    if (traits.interests > 75 && cat === "Prompt engineering") score += 4;
    if (traits.motivation > 75 && cat === "Fullstack") score += 2;
    return { id: c.id as string, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.filter((s) => s.score > 0).slice(0, 5);
  if (picked.length >= 3) return picked.map((p) => p.id);
  return courses.slice(0, 5).map((c) => c.id as string);
}

function deriveStrengthsWeaknesses(
  mbti: string,
  traits: TraitScores
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (traits.motivation >= 70) strengths.push("Động lực và mục tiêu học tập rõ ràng");
  else weaknesses.push("Cần củng cố thói quen và mục tiêu ngắn hạn");

  if (traits.learningStyle >= 70) strengths.push("Phù hợp với nhiều hình thức học tập");
  else weaknesses.push("Nên thử kết hợp video + bài tập hands-on");

  if (traits.foundationSkills >= 70) strengths.push("Nền tảng kỹ thuật / công cụ tốt");
  else weaknesses.push("Nên bổ sung Git, SQL và một ngôn ngữ chính");

  if (traits.interests >= 70) strengths.push("Định hướng sản phẩm / lĩnh vực khá rõ");
  else weaknesses.push("Khám phá thêm dự án thực tế để tìm đam mê");

  strengths.push(`Xu hướng tính cách MBTI: ${mbti} — phù hợp với nhóm vai trò đã gợi ý.`);

  return { strengths, weaknesses };
}

export function buildCareerSummary(
  mbti: string,
  traits: TraitScores,
  careers: string[]
): string {
  return [
    `Kết quả MBTI (ước lượng từ bài test): ${mbti}.`,
    `Điểm trụ: động lực ${traits.motivation}, phong cách học ${traits.learningStyle}, nền tảng ${traits.foundationSkills}, sở thích ${traits.interests} (thang 0–100).`,
    `Gợi ý nghề: ${careers.slice(0, 5).join(", ")}.`,
    "Đây chỉ là gợi ý khởi đầu; bạn có thể điều chỉnh theo thực tế.",
  ].join(" ");
}

export async function analyzeAssessment(
  answers: Record<string, string>,
  supabase: SupabaseClient
): Promise<AssessmentAnalysis> {
  for (const q of ASSESSMENT_QUESTIONS) {
    if (!q.required) continue;
    const v = answers[q.code]?.trim() ?? "";
    if (!v) {
      throw new Error(`Thiếu câu trả lời: ${q.code}`);
    }
    if (q.type === "checkbox" && !v.split(",").some((s) => s.trim())) {
      throw new Error(`Thiếu lựa chọn: ${q.code}`);
    }
  }

  const mbti_type = computeMBTI(answers);
  const traits = computeTraits(answers);
  const suggested_careers = suggestCareers(mbti_type, traits);
  const suggested_course_ids = await suggestCourses(supabase, mbti_type, traits, answers);
  const { strengths, weaknesses } = deriveStrengthsWeaknesses(mbti_type, traits);
  const career_orientation_summary = buildCareerSummary(
    mbti_type,
    traits,
    suggested_careers
  );

  return {
    mbti_type,
    traits,
    strengths,
    weaknesses,
    suggested_careers,
    suggested_course_ids,
    career_orientation_summary,
  };
}
