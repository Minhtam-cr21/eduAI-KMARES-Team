import { z } from "zod";
import type { AICourseDraft } from "@/lib/ai/ai-course-draft";
import { openai } from "@/lib/ai/openai-client";
import { normalizeCourseCategory } from "@/lib/constants/course-categories";

export function normalizeAiCategory(raw: string): string {
  return normalizeCourseCategory(raw);
}

const aiLessonZ = z.object({
  title: z.string().min(1),
  content: z.string(),
  code_template: z.union([z.string(), z.null()]).optional(),
  order_index: z.number().int().optional(),
});

const aiCourseZ = z.object({
  title: z.string().min(1),
  description: z.string(),
  summary: z.string(),
  category: z.string().min(1),
  lessons: z.array(aiLessonZ).min(3).max(8),
});

export type ParsedAiCourseJson = z.infer<typeof aiCourseZ>;

function composeCourseContent(summary: string, description: string): string {
  return [summary.trim(), description.trim()].filter(Boolean).join("\n\n");
}

export function mapAiJsonToDraft(
  raw: ParsedAiCourseJson,
  opts: { teacherTitle?: string; teacherDescription?: string }
): AICourseDraft {
  const lessons = [...raw.lessons].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const title =
    opts.teacherTitle?.trim() ||
    raw.title.trim() ||
    "Kh\u00f3a h\u1ecdc m\u1edbi";
  const description =
    opts.teacherDescription?.trim() || raw.description.trim();
  const summary = raw.summary.trim();
  return {
    title,
    description,
    summary,
    content: composeCourseContent(summary, description),
    course_type: "skill",
    category: normalizeAiCategory(raw.category),
    thumbnail_url: null,
    lessons: lessons.map((l) => ({
      title: l.title.trim(),
      content: l.content,
      video_url: null,
      code_template:
        l.code_template && String(l.code_template).trim()
          ? String(l.code_template).trim()
          : null,
    })),
  };
}

export function buildFallbackAiDraft(topic: string, sourceSnippet: string): AICourseDraft {
  const t = topic.trim() || "Kh\u00f3a h\u1ecdc l\u1eadp tr\u00ecnh";
  const desc =
    sourceSnippet.trim().slice(0, 240) ||
    "Kh\u00f3a h\u1ecdc \u0111\u01b0\u1ee3c t\u1ea1o m\u1eabu khi AI kh\u00f4ng kh\u1ea3 d\u1ee5ng. Vui l\u00f2ng ch\u1ec9nh s\u1eeda \u0111\u1ea7y \u0111\u1ee7.";
  const sum =
    "T\u00f3m t\u1eaft: N\u1ed9i dung s\u1ebd \u0111\u01b0\u1ee3c gi\u00e1o vi\u00ean b\u1ed5 sung sau. C\u00e1c b\u00e0i h\u1ecdc d\u01b0\u1edbi \u0111\u00e2y l\u00e0 khung s\u1eb5n \u0111\u1ec3 b\u1ea1n thay th\u1ebf b\u1eb1ng n\u1ed9i dung th\u1ef1c t\u1ebf.";
  return {
    title: t.slice(0, 200),
    description: desc,
    summary: sum,
    content: composeCourseContent(sum, desc),
    course_type: "skill",
    category: "Python",
    thumbnail_url: null,
    lessons: [
      {
        title: "B\u00e0i 1: Gi\u1edbi thi\u1ec7u",
        content:
          "## M\u1ee5c ti\u00eau\n\n- L\u00e0m quen v\u1edbi ch\u1ee7 \u0111\u1ec1.\n\n## N\u1ed9i dung\n\n*(Thay b\u1eb1ng n\u1ed9i dung th\u1ef1c t\u1ebf.)*",
        video_url: null,
        code_template: null,
      },
      {
        title: "B\u00e0i 2: Ki\u1ebfn th\u1ee9c c\u1ed1t l\u00f5i",
        content:
          "## L\u00fd thuy\u1ebft\n\n- Kh\u00e1i ni\u1ec7m ch\u00ednh.\n\n## Th\u1ef1c h\u00e0nh\n\n*(B\u00e0i t\u1eadp g\u1ee3i \u00fd.)*",
        video_url: null,
        code_template: null,
      },
      {
        title: "B\u00e0i 3: T\u1ed5ng k\u1ebft",
        content:
          "## \u00d4n t\u1eadp\n\n- T\u00f3m t\u1eaft.\n\n## B\u01b0\u1edbc ti\u1ebfp theo\n\n*(H\u01b0\u1edbng d\u1eabn h\u1ecdc th\u00eam.)*",
        video_url: null,
        code_template: null,
      },
    ],
  };
}

const SYSTEM_PRIMARY = `You design programming courses. Reply with ONE valid JSON object only (no markdown fences, no extra text).
All human-facing strings (title, description, summary, category, lesson titles, lesson content) must be in Vietnamese.
lessons: between 3 and 8 items. Each lesson.content is markdown; code_template is a starter code string or null if not a coding exercise.
category must be exactly one of: Python, Java, C++, SQL, Frontend, Backend, Fullstack, Prompt engineering (English spelling as listed).
order_index: integer lesson order (1..n). If the teacher did not suggest a course title, you must invent a clear Vietnamese title.`;

const SYSTEM_RETRY = `The previous JSON was invalid. Return ONLY one JSON object with keys: title, description, summary, category, lessons.
lessons is an array of {title, content, code_template, order_index} with length 3-8. Vietnamese for instructional text. No text outside JSON.`;

function buildUserPrompt(args: {
  topic: string;
  teacherTitle?: string;
  teacherDescription?: string;
  sourceText: string;
  enrichmentBrief?: string;
}): string {
  const cap = 24_000;
  const body = args.sourceText.trim().slice(0, cap);
  const enrich = args.enrichmentBrief?.trim()
    ? `\n\n--- Supplementary syllabus context (general knowledge; do not override the document) ---\n${args.enrichmentBrief.trim().slice(0, 4000)}`
    : "";
  return `Input for course design:

Topic / goals (may be short): ${args.topic || "(infer from reference material)"}
${args.teacherTitle ? `Teacher suggested title: ${args.teacherTitle}` : "Title: (empty — you choose an attractive Vietnamese title)"}
${args.teacherDescription ? `Teacher notes: ${args.teacherDescription}` : ""}

--- Reference material ---
${body || "(none)"}
${enrich}

Output JSON only:
{
  "title": "string",
  "description": "1-2 short sentences for catalog (Vietnamese)",
  "summary": "main content summary ~80-120 words in Vietnamese",
  "category": "one of the allowed English labels",
  "lessons": [
    {
      "title": "string",
      "content": "markdown body",
      "code_template": "string or null",
      "order_index": 1
    }
  ]
}`;
}

function resolveModel(): string {
  if (process.env.OPENAI_COURSE_USE_GPT4O === "true") {
    return "gpt-4o";
  }
  return (
    process.env.OPENAI_COURSE_OUTLINE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export async function generateCourseDraftWithOpenAI(args: {
  topic: string;
  teacherTitle?: string;
  teacherDescription?: string;
  sourceText: string;
  enrichmentBrief?: string;
}): Promise<{ draft: AICourseDraft; usedFallback: boolean }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return {
      draft: buildFallbackAiDraft(args.topic, args.sourceText),
      usedFallback: true,
    };
  }

  const model = resolveModel();
  const userContent = buildUserPrompt(args);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: attempt === 0 ? SYSTEM_PRIMARY : SYSTEM_RETRY },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: attempt === 0 ? 0.45 : 0.2,
        max_tokens: 12_000,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) continue;

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }

      const parsed = aiCourseZ.safeParse(data);
      if (parsed.success) {
        const draft = mapAiJsonToDraft(parsed.data, {
          teacherTitle: args.teacherTitle,
          teacherDescription: args.teacherDescription,
        });
        return { draft, usedFallback: false };
      }
    } catch (e) {
      console.warn("[openai-course-generator] attempt", attempt + 1, e);
    }
  }

  return {
    draft: buildFallbackAiDraft(args.topic, args.sourceText),
    usedFallback: true,
  };
}
