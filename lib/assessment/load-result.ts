import type { SupabaseClient } from "@supabase/supabase-js";

import { computeTraits } from "./analyzer";
export type AssessmentTraits = {
  motivation: number;
  learningStyle: number;
  foundationSkills: number;
  interests: number;
};

export type AssessmentResultPayload = {
  profile: {
    mbti_type: string | null;
    career_orientation: string | null;
    goal: string | null;
    assessment_completed: boolean;
    assessment_completed_at: string | null;
  };
  career: {
    id: string;
    strengths: string[];
    weaknesses: string[];
    suggested_careers: string[];
    suggested_courses: string[];
    created_at: string;
  };
  traits: AssessmentTraits;
  courses: Array<{
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    category: string | null;
  }>;
};

export async function loadAssessmentResult(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; data: AssessmentResultPayload }
  | { ok: false; reason: "not_completed" | "no_career_row" }
> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select(
      "mbti_type, career_orientation, goal, assessment_completed, assessment_completed_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) {
    return { ok: false, reason: "not_completed" };
  }

  if (profile.assessment_completed !== true) {
    return { ok: false, reason: "not_completed" };
  }

  const { data: career, error: cErr } = await supabase
    .from("career_orientations")
    .select(
      "id, strengths, weaknesses, suggested_careers, suggested_courses, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cErr || !career) {
    return { ok: false, reason: "no_career_row" };
  }

  const { data: responses, error: rErr } = await supabase
    .from("assessment_responses")
    .select("question_code, answer")
    .eq("user_id", userId);

  const answerMap: Record<string, string> = {};
  if (!rErr && responses?.length) {
    for (const row of responses) {
      if (row.question_code && typeof row.answer === "string") {
        answerMap[row.question_code as string] = row.answer;
      }
    }
  }

  const traits = computeTraits(answerMap);

  const rawCourseIds: unknown[] = Array.isArray(career.suggested_courses)
    ? (career.suggested_courses as unknown[])
    : [];
  const courseIds: string[] = [];
  for (const id of rawCourseIds) {
    if (typeof id === "string" && id.length > 0) courseIds.push(id);
  }

  let courses: AssessmentResultPayload["courses"] = [];
  if (courseIds.length > 0) {
    const { data: courseRows } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url, category")
      .in("id", courseIds)
      .eq("status", "published");

    const order = new Map(courseIds.map((id, i) => [id, i]));
    courses = (courseRows ?? [])
      .map((c) => ({
        id: c.id as string,
        title: c.title as string,
        description: (c.description as string | null) ?? null,
        thumbnail_url: (c.thumbnail_url as string | null) ?? null,
        category: (c.category as string | null) ?? null,
      }))
      .sort(
        (a, b) =>
          (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)
      );
  }

  return {
    ok: true,
    data: {
      profile: {
        mbti_type: profile.mbti_type as string | null,
        career_orientation: profile.career_orientation as string | null,
        goal: profile.goal as string | null,
        assessment_completed: profile.assessment_completed === true,
        assessment_completed_at:
          (profile.assessment_completed_at as string | null) ?? null,
      },
      career: {
        id: career.id as string,
        strengths: (career.strengths as string[]) ?? [],
        weaknesses: (career.weaknesses as string[]) ?? [],
        suggested_careers: (career.suggested_careers as string[]) ?? [],
        suggested_courses: courseIds,
        created_at: career.created_at as string,
      },
      traits,
      courses,
    },
  };
}
