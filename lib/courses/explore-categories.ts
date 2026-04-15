import {
  COURSE_CATEGORY_OPTIONS,
  type CourseCategoryOption,
} from "@/lib/constants/course-categories";

/** Nhãn tiếng Việt cho giá trị lưu trong DB. */
export const CATEGORY_LABEL_VI: Record<CourseCategoryOption, string> = {
  Algorithms: "Thuật toán",
  "Basic Knowledge": "Kiến th��c�",
  "Basic Programming": "Lập trình�",
  "Advanced Programming": "Lập trình nâng cao",
  "Problem Solving": "Giải quyết vấn đề",
  "Prompt Engineering": "Prompt Engineering",
};

export type ExploreTabSlug = "all" | CourseCategoryOption;

export const EXPLORE_TABS: {
  slug: ExploreTabSlug;
  labelVi: string;
  /** Giá trị gửi lên GET /api/courses?category= */
  apiCategory: CourseCategoryOption | null;
}[] = [
  { slug: "all", labelVi: "Tất cả khóa học", apiCategory: null },
  { slug: "Algorithms", labelVi: CATEGORY_LABEL_VI.Algorithms, apiCategory: "Algorithms" },
  {
    slug: "Basic Knowledge",
    labelVi: CATEGORY_LABEL_VI["Basic Knowledge"],
    apiCategory: "Basic Knowledge",
  },
  {
    slug: "Basic Programming",
    labelVi: CATEGORY_LABEL_VI["Basic Programming"],
    apiCategory: "Basic Programming",
  },
  {
    slug: "Advanced Programming",
    labelVi: CATEGORY_LABEL_VI["Advanced Programming"],
    apiCategory: "Advanced Programming",
  },
  {
    slug: "Problem Solving",
    labelVi: CATEGORY_LABEL_VI["Problem Solving"],
    apiCategory: "Problem Solving",
  },
  {
    slug: "Prompt Engineering",
    labelVi: CATEGORY_LABEL_VI["Prompt Engineering"],
    apiCategory: "Prompt Engineering",
  },
];

const SLUG_TO_CATEGORY = new Map<string, CourseCategoryOption | null>();
for (const t of EXPLORE_TABS) {
  SLUG_TO_CATEGORY.set(t.slug.toLowerCase(), t.apiCategory);
}

/** Slug URL (algorithms, basic-knowledge, …) → canonical DB; null = tất cả. */
const ALIAS_SLUGS: Record<string, CourseCategoryOption> = {
  algorithms: "Algorithms",
  "basic-knowledge": "Basic Knowledge",
  "basic-programming": "Basic Programming",
  "advanced-programming": "Advanced Programming",
  "problem-solving": "Problem Solving",
  "prompt-engineering": "Prompt Engineering",
};

/**
 * Query `category` t�� URL: chấp nhận slug kebab-case, slug Pascal, hoặc giá trị DB chính xác.
 */
export function resolveCoursesCategoryFilter(param: string | null): string | null {
  if (!param) return null;
  const p = param.trim();
  if (!p || p.toLowerCase() === "all") return null;

  const alias = ALIAS_SLUGS[p.toLowerCase()];
  if (alias) return alias;

  const fromTab = SLUG_TO_CATEGORY.get(p.toLowerCase());
  if (fromTab !== undefined) return fromTab;

  if (COURSE_CATEGORY_OPTIONS.includes(p as CourseCategoryOption)) return p;

  const byName = COURSE_CATEGORY_OPTIONS.find(
    (c) => c.toLowerCase() === p.toLowerCase()
  );
  return byName ?? null;
}

export function categoryBadgeLabel(dbCategory: string | null | undefined): string {
  if (!dbCategory?.trim()) return "Khóa học";
  const t = dbCategory.trim();
  const match = COURSE_CATEGORY_OPTIONS.find((c) => c === t);
  if (match) return CATEGORY_LABEL_VI[match];
  const fuzzy = COURSE_CATEGORY_OPTIONS.find(
    (c) => c.toLowerCase() === t.toLowerCase()
  );
  if (fuzzy) return CATEGORY_LABEL_VI[fuzzy];
  return t;
}
