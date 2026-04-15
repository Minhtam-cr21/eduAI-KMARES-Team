/** Giá trị `courses.category` (catalog / explore / AI). */
export const COURSE_CATEGORY_OPTIONS = [
  "Algorithms",
  "Basic Knowledge",
  "Basic Programming",
  "Advanced Programming",
  "Problem Solving",
  "Prompt Engineering",
] as const;

export type CourseCategoryOption = (typeof COURSE_CATEGORY_OPTIONS)[number];

/** Chu��n hoá category t�� AI hoặc nhập tay (g��m alias c�� như Python, Frontend). */
const LEGACY_TO_CANONICAL: Record<string, CourseCategoryOption> = {
  python: "Basic Programming",
  java: "Basic Programming",
  "c++": "Basic Programming",
  c: "Basic Programming",
  sql: "Basic Programming",
  php: "Basic Programming",
  ruby: "Basic Programming",
  go: "Basic Programming",
  rust: "Basic Programming",
  swift: "Basic Programming",
  kotlin: "Basic Programming",
  frontend: "Advanced Programming",
  backend: "Advanced Programming",
  fullstack: "Advanced Programming",
  "full stack": "Advanced Programming",
  "vibe coding": "Advanced Programming",
  web: "Advanced Programming",
  mobile: "Advanced Programming",
  "prompt engineering": "Prompt Engineering",
  prompt: "Prompt Engineering",
  algorithms: "Algorithms",
  "data structures": "Algorithms",
  dsa: "Algorithms",
  "thuật toán": "Algorithms",
  data: "Problem Solving",
  "data science": "Problem Solving",
  "machine learning": "Problem Solving",
  "problem solving": "Problem Solving",
  general: "Basic Knowledge",
  "t��ng quát": "Basic Knowledge",
  "computer science": "Basic Knowledge",
};

export function normalizeCourseCategory(raw: string): CourseCategoryOption {
  const t = raw.trim();
  const lower = t.toLowerCase();
  const legacy = LEGACY_TO_CANONICAL[lower];
  if (legacy) return legacy;

  const exact = COURSE_CATEGORY_OPTIONS.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  for (const c of COURSE_CATEGORY_OPTIONS) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  return "Basic Programming";
}
