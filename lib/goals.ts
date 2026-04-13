/** Slugs đồng bộ với multiselect admin và filter lộ trình. */
export const GOAL_SLUGS = ["web", "data", "game", "mobile", "other"] as const;
export type GoalSlug = (typeof GOAL_SLUGS)[number];

const LABEL_TO_SLUG: Record<string, GoalSlug> = {
  "Web development": "web",
  "Data science": "data",
  "Game development": "game",
  "Mobile app": "mobile",
  Other: "other",
};

/**
 * Map `profiles.goal` (mục tiêu hồ sơ) → slug. Không khớp → `other`.
 */
export function mapProfileGoalToSlug(
  goal: string | null | undefined
): GoalSlug {
  if (!goal?.trim()) return "other";
  const t = goal.trim();
  if (LABEL_TO_SLUG[t]) return LABEL_TO_SLUG[t];
  const lower = t.toLowerCase();
  if (lower.includes("web")) return "web";
  if (lower.includes("data")) return "data";
  if (lower.includes("game")) return "game";
  if (lower.includes("mobile")) return "mobile";
  return "other";
}

/** goals rỗng/null → phù hợp mọi user; ngược lại phải chứa slug của user. */
export function lessonGoalsMatchUser(
  lessonGoals: string[] | null | undefined,
  userSlug: GoalSlug
): boolean {
  if (!lessonGoals || lessonGoals.length === 0) return true;
  return lessonGoals.includes(userSlug);
}

export const GOAL_OPTIONS: { value: GoalSlug; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "data", label: "Data" },
  { value: "game", label: "Game" },
  { value: "mobile", label: "Mobile" },
  { value: "other", label: "Other" },
];
