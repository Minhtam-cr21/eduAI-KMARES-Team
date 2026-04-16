import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  PathSuggestionAnalysisSource,
  PersonalizedPathSignal,
  PersonalizedPathSuggestion,
  PersonalizedPathSequenceItem,
} from "@/lib/personalized-path/contracts";
import { personalizedPathSuggestionSchema } from "@/lib/personalized-path/contracts";
import {
  createSchemaSyncError,
  type SchemaDependency,
} from "@/lib/supabase/schema-sync";
import { buildFallbackLearnerAnalysis, buildLearnerProfile } from "./learner-profile";
import {
  learnerAnalysisSchema,
  learnerProfileSchema,
  type LearnerAnalysis,
  type LearnerProfile,
} from "./contracts";
import { computeMBTI } from "./analyzer";

export type CourseSequenceItem = PersonalizedPathSequenceItem;

type PublishedCourse = { id: string; category: string; title?: string };
type GoalKey = "web" | "data" | "game" | "mobile" | "automation" | "other";
type ProfileRow = { goal?: string | null; mbti_type?: string | null } | null;
type OrientationRow = {
  suggested_courses?: unknown;
  mbti_type?: string | null;
  learner_profile?: unknown;
  ai_analysis?: unknown;
  analysis_source?: string | null;
} | null;
type PathGenerationContext = {
  learnerProfile: LearnerProfile;
  learnerAnalysis: LearnerAnalysis;
  analysisSource: PathSuggestionAnalysisSource;
  structuredAnalysisSource: string | null;
  signals: PersonalizedPathSignal[];
  goalDisplay: string;
  goalKey: GoalKey;
  mbti: string;
};

const RULE_ORDER: Record<GoalKey, string[]> = {
  web: ["Frontend", "Backend", "Fullstack", "SQL"],
  data: ["SQL", "Backend", "Python", "Prompt engineering"],
  game: ["C++", "Frontend", "Backend"],
  mobile: ["Frontend", "Fullstack", "Backend"],
  automation: ["Backend", "Python", "Prompt engineering"],
  other: ["Frontend", "SQL", "Backend"],
};

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Frontend",
    keywords: ["frontend", "front-end", "giao diện", "ui", "ux", "web", "website"],
  },
  {
    category: "Backend",
    keywords: ["backend", "back-end", "api", "server", "dịch vụ", "automation"],
  },
  {
    category: "Fullstack",
    keywords: ["fullstack", "full-stack", "sản phẩm", "end-to-end"],
  },
  {
    category: "SQL",
    keywords: ["sql", "database", "data", "dữ liệu", "analytics"],
  },
  {
    category: "Python",
    keywords: ["python", "phân tích", "analysis", "ml", "automation"],
  },
  {
    category: "Prompt engineering",
    keywords: ["prompt", "llm", "ai", "openai"],
  },
  { category: "C++", keywords: ["game", "gaming", "c++"] },
  { category: "Java", keywords: ["java", "enterprise", "oop"] },
  { category: "Vibe Coding", keywords: ["prototype", "vibe", "thử nhanh", "demo"] },
];

const PHASE3_PATH_INPUT_DEPENDENCY: SchemaDependency = {
  phase: "Phase 3",
  migrationFile: "supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql",
  feature: "personalized path suggestion",
  relation: "career_orientations",
  columns: [
    "learner_profile",
    "ai_analysis",
    "analysis_source",
    "assessment_version",
  ],
};

function normalizeGoalFromA1(answers: Record<string, string>): GoalKey {
  const raw = (answers.A1 ?? "").trim().toLowerCase();
  if (raw === "web") return "web";
  if (raw === "data") return "data";
  if (raw === "game") return "game";
  if (raw === "mobile") return "mobile";
  if (raw === "automation") return "automation";
  return "other";
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

function addSignal(
  signals: PersonalizedPathSignal[],
  key: string,
  label: string,
  value: string | null | undefined
) {
  const normalized = value?.trim();
  if (!normalized || signals.some((signal) => signal.key === key)) return;
  signals.push({ key, label, value: normalized });
}

function inferGoalKeyFromTexts(values: string[]): GoalKey {
  const haystack = values.join(" ").toLowerCase();
  if (
    haystack.includes("data") ||
    haystack.includes("dữ liệu") ||
    haystack.includes("sql") ||
    haystack.includes("analytics")
  ) {
    return "data";
  }
  if (
    haystack.includes("game") ||
    haystack.includes("gaming") ||
    haystack.includes("c++")
  ) {
    return "game";
  }
  if (
    haystack.includes("mobile") ||
    haystack.includes("android") ||
    haystack.includes("ios")
  ) {
    return "mobile";
  }
  if (
    haystack.includes("automation") ||
    haystack.includes("tự động") ||
    haystack.includes("backend") ||
    haystack.includes("api")
  ) {
    return "automation";
  }
  if (
    haystack.includes("web") ||
    haystack.includes("frontend") ||
    haystack.includes("website") ||
    haystack.includes("fullstack")
  ) {
    return "web";
  }
  return "other";
}

function inferPreferredCategories(args: {
  goalKey: GoalKey;
  profile: LearnerProfile;
  analysis: LearnerAnalysis;
}): string[] {
  const scoreByCategory = new Map<string, number>();

  for (const category of RULE_ORDER[args.goalKey] ?? RULE_ORDER.other) {
    scoreByCategory.set(category, (scoreByCategory.get(category) ?? 0) + 3);
  }

  const haystacks = [
    args.profile.goal_summary,
    ...args.profile.interests,
    ...args.profile.learning_style_signals,
    ...args.profile.motivation_signals,
    ...args.profile.risk_flags,
    args.analysis.learner_summary,
    ...args.analysis.path_focus,
    ...args.analysis.support_strategies,
  ].map((value) => value.toLowerCase());

  for (const hint of CATEGORY_KEYWORDS) {
    let points = 0;
    for (const source of haystacks) {
      if (hint.keywords.some((keyword) => source.includes(keyword))) {
        points += 2;
      }
    }
    if (points > 0) {
      scoreByCategory.set(
        hint.category,
        (scoreByCategory.get(hint.category) ?? 0) + points
      );
    }
  }

  return Array.from(scoreByCategory.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
}

/**
 * Gợi ý thứ tự khóa theo learner signals đã chuẩn hóa và category đã publish.
 */
function ruleBasedCourseOrder(
  courses: PublishedCourse[],
  goalKey: GoalKey,
  suggestedFromOrientation: string[],
  preferredCategories: string[]
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
    return list.map((course) => course.id);
  };

  const orderLabels = uniq([
    ...preferredCategories,
    ...(RULE_ORDER[goalKey] ?? RULE_ORDER.other),
  ]);
  const out: string[] = [];

  for (const id of suggestedFromOrientation) {
    if (courses.some((course) => course.id === id)) out.push(id);
  }

  for (const label of orderLabels) {
    out.push(...pickFromCategory(label));
  }

  for (const course of courses) {
    if (!out.includes(course.id)) out.push(course.id);
  }

  return uniq(out);
}

function buildSequenceFromIds(
  orderedIds: string[],
  titleById: Map<string, string>,
  daysPerCourse = 7
): CourseSequenceItem[] {
  let cumulative = 0;
  return orderedIds.map((course_id, index) => {
    cumulative += daysPerCourse;
    return {
      course_id,
      title: titleById.get(course_id) ?? "",
      order_index: index,
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
    map[String(row.question_code)] = String(row.answer ?? "");
  }
  return map;
}

async function resolvePathGenerationContext(
  supabase: SupabaseClient,
  userId: string,
  orientation: OrientationRow,
  profile: ProfileRow
): Promise<PathGenerationContext> {
  const structuredProfile = learnerProfileSchema.safeParse(
    orientation?.learner_profile
  );
  const structuredAnalysis = learnerAnalysisSchema.safeParse(
    orientation?.ai_analysis
  );

  let answers: Record<string, string> | null = null;
  let learnerProfile: LearnerProfile;
  let learnerAnalysis: LearnerAnalysis;
  let analysisSource: PathSuggestionAnalysisSource;

  if (structuredProfile.success) {
    learnerProfile = structuredProfile.data;
    learnerAnalysis = structuredAnalysis.success
      ? structuredAnalysis.data
      : buildFallbackLearnerAnalysis(learnerProfile);
    analysisSource = structuredAnalysis.success
      ? "structured_profile_with_ai"
      : "structured_profile";
  } else {
    answers = await loadAssessmentAnswers(supabase, userId);
    learnerProfile = buildLearnerProfile(answers);
    learnerAnalysis = buildFallbackLearnerAnalysis(learnerProfile);
    analysisSource = "raw_answers_fallback";
  }

  const goalDisplay =
    profile?.goal?.trim() ||
    learnerProfile.goal_summary ||
    "Mục tiêu chưa xác định rõ";
  const goalKey =
    analysisSource === "raw_answers_fallback" && answers
      ? normalizeGoalFromA1(answers)
      : inferGoalKeyFromTexts([
          goalDisplay,
          ...learnerProfile.interests,
          ...learnerAnalysis.path_focus,
        ]);

  const mbti =
    (orientation?.mbti_type as string | null)?.trim() ||
    (profile?.mbti_type as string | null)?.trim() ||
    learnerProfile.mbti_type ||
    (answers ? computeMBTI(answers) : "INTJ");

  const signals: PersonalizedPathSignal[] = [];
  addSignal(signals, "mbti_type", "MBTI", mbti);
  addSignal(
    signals,
    "goal_summary",
    "Mục tiêu học",
    learnerProfile.goal_summary || goalDisplay
  );
  addSignal(
    signals,
    "constraint_summary",
    "Ràng buộc hiện tại",
    learnerProfile.constraint_summary
  );
  addSignal(
    signals,
    "recommended_pacing",
    "Nhịp độ đề xuất",
    learnerAnalysis.recommended_pacing
  );
  addSignal(
    signals,
    "path_focus",
    "Trọng tâm lộ trình",
    learnerAnalysis.path_focus.slice(0, 3).join(", ")
  );
  addSignal(
    signals,
    "interests",
    "Sở thích nổi bật",
    learnerProfile.interests.slice(0, 3).join(", ")
  );
  addSignal(
    signals,
    "risk_flags",
    "Rủi ro cần lưu ý",
    learnerProfile.risk_flags.slice(0, 3).join(", ")
  );

  return {
    learnerProfile,
    learnerAnalysis,
    analysisSource,
    structuredAnalysisSource:
      typeof orientation?.analysis_source === "string"
        ? orientation.analysis_source
        : null,
    signals,
    goalDisplay,
    goalKey,
    mbti,
  };
}

/**
 * Sinh course_sequence (thứ tự + offset ngày tích luỹ) từ learner_profile / ai_analysis,
 * chỉ fallback về assessment_responses khi structured profile chưa sẵn sàng.
 */
export async function generatePathFromAssessment(
  userId: string,
  supabase: SupabaseClient
): Promise<PersonalizedPathSuggestion> {
  const [{ data: profile, error: pErr }, { data: orientation, error: oErr }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("goal, mbti_type")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("career_orientations")
        .select(
          "suggested_courses, mbti_type, learner_profile, ai_analysis, analysis_source"
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (pErr) throw new Error(pErr.message);
  if (oErr) {
    const schemaError = createSchemaSyncError(oErr, PHASE3_PATH_INPUT_DEPENDENCY);
    if (schemaError) throw schemaError;
    throw new Error(oErr.message);
  }

  const context = await resolvePathGenerationContext(
    supabase,
    userId,
    orientation,
    profile
  );

  const suggestedRaw = orientation?.suggested_courses;
  const suggestedFromOrientation: string[] = [];
  if (Array.isArray(suggestedRaw)) {
    for (const value of suggestedRaw) {
      if (typeof value === "string" && z.string().uuid().safeParse(value).success) {
        suggestedFromOrientation.push(value);
      }
    }
  }

  const { data: published, error: catalogErr } = await supabase
    .from("courses")
    .select("id, category, title")
    .eq("status", "published");

  if (catalogErr) throw new Error(catalogErr.message);
  const courses = (published ?? []) as PublishedCourse[];
  const catalog = courses.map((course) => ({
    id: course.id,
    category: course.category,
    title: course.title ?? "",
  }));

  const preferredCategories = inferPreferredCategories({
    goalKey: context.goalKey,
    profile: context.learnerProfile,
    analysis: context.learnerAnalysis,
  }).filter((category) =>
    catalog.some(
      (course) => course.category.trim().toLowerCase() === category.toLowerCase()
    )
  );

  const orderedIds = ruleBasedCourseOrder(
    courses,
    context.goalKey,
    suggestedFromOrientation,
    preferredCategories
  );

  const validIds = orderedIds.filter((id) => courses.some((course) => course.id === id));
  const titleById = new Map<string, string>();
  for (const course of courses) {
    titleById.set(course.id, course.title?.trim() || course.category || course.id);
  }

  const courseSequence = buildSequenceFromIds(validIds, titleById);
  const reasoning = [
    `Ưu tiên learner_profile làm input chính với MBTI ${context.mbti}.`,
    `Mục tiêu hiện tại: ${context.goalDisplay}.`,
    preferredCategories.length > 0
      ? `Category được ưu tiên từ learner_profile/ai_analysis: ${preferredCategories.join(", ")}.`
      : null,
    suggestedFromOrientation.length > 0
      ? "Giữ ưu tiên các khóa đã xuất hiện trong career_orientations.suggested_courses nếu còn publish."
      : null,
    context.structuredAnalysisSource
      ? `Structured assessment source: ${context.structuredAnalysisSource}.`
      : null,
    context.analysisSource === "raw_answers_fallback"
      ? "Structured learner_profile chưa sẵn sàng hoặc không hợp lệ nên route fallback về assessment_responses."
      : "assessment_responses chỉ còn là fallback, không phải input chính.",
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return personalizedPathSuggestionSchema.parse({
    courseSequence,
    reasoning,
    learnerSignalsUsed: context.signals,
    analysisSource: context.analysisSource,
  });
}
