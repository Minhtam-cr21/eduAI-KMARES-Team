import { z } from "zod";

const lessonSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  video_url: z
    .preprocess((v) => (v === "" || v === undefined ? null : v), z.string().nullable())
    .optional(),
  code_template: z
    .preprocess((v) => (v === "" || v === undefined ? null : v), z.string().nullable())
    .optional(),
});

const outlineSchema = z.object({
  course_title: z.string().min(1),
  course_description: z.string(),
  course_type: z.enum(["skill", "role"]).optional(),
  category: z.string().optional(),
  lessons: z.array(lessonSchema).min(4).max(24),
});

export type GeneratedCourseOutline = z.infer<typeof outlineSchema>;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const MAX_SOURCE_CHARS = 200_000;

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fence?.[1]?.trim() ?? t;
  return JSON.parse(inner);
}

export type GenerateOutlineMeta = {
  hadPdfUpload: boolean;
  pdfCharsExtracted: number;
  pdfTextEmpty: boolean;
  sourceTruncated: boolean;
  externalContextBrief?: string;
};

const SYSTEM_PROMPT = `You are an expert curriculum designer for Vietnamese teachers.

Return ONLY valid JSON (no markdown code fences around it) with this exact shape:
{"course_title":"string","course_description":"string","course_type":"skill" or "role","category":"string short label e.g. Python","lessons":[{"title":"string","content":"string (markdown lesson body)","video_url":null or "https://...","code_template":null or "string (sample code if lesson is coding exercise)"}]}

Rules:
- course_title, course_description, category, every lesson title, and every lesson content must be in Vietnamese.
- course_type: usually "skill" for technical courses.
- category: concise topic tag derived from content (e.g. "Python", "Web").
- code_template: non-empty only when the lesson includes a hands-on programming exercise; otherwise null.
- TOP PRIORITY: When the section "--- Extracted document ---" contains substantial text, you MUST base lesson titles, order, definitions, and explanations on that document. Read it carefully. Reorganize into clear lessons; do not add technical claims that are not supported by the document.
- If the extracted document is empty or nearly empty, build a sensible course from the teacher topic and any "Supplementary context" block. In course_description, say clearly that content is topic-driven and the teacher should review and extend.
- lessons: 4 to 12 items (prefer 6-10). Each lesson: markdown with ## headings, bullet lists, short examples only when grounded in the document.
- video_url: null unless the document contains an explicit https video URL.
- course_description: 2-4 sentences for students.`;

/** Generate course + lessons from topic/title and PDF or text extract. Server-only. */
export async function generateCourseOutlineFromText(
  args: {
    topic: string;
    title?: string;
    description?: string;
    sourceText: string;
  },
  meta: GenerateOutlineMeta
): Promise<GeneratedCourseOutline> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model =
    process.env.OPENAI_COURSE_OUTLINE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const teacherBlock = [
    args.title ? `Teacher title: ${args.title}` : null,
    args.description ? `Teacher notes: ${args.description}` : null,
    `Teacher topic / learning goals: ${args.topic}`,
  ]
    .filter(Boolean)
    .join("\n");

  const docBody = meta.pdfTextEmpty
    ? "(No text could be extracted from the PDF. Use topic + supplementary context only.)"
    : args.sourceText.slice(0, MAX_SOURCE_CHARS);

  const metaBlock = [
    meta.hadPdfUpload
      ? `PDF was uploaded. Extracted text length: ~${meta.pdfCharsExtracted} characters.`
      : "No PDF uploaded; primary source is topic and optional text file.",
    meta.sourceTruncated
      ? `WARNING: Document was truncated to ${MAX_SOURCE_CHARS} characters. Prioritize early sections and broad coverage.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const supplement = meta.externalContextBrief?.trim()
    ? `--- Supplementary context (general knowledge; do NOT override facts from the PDF) ---\n${meta.externalContextBrief.trim()}`
    : "";

  const userMessage = `${teacherBlock}

${metaBlock}
${supplement ? `\n${supplement}\n` : ""}
--- Extracted document (PDF / text) ---
${docBody}`;

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${rawText.slice(0, 400)}`);
  }

  let parsedJson: unknown;
  try {
    const j = JSON.parse(rawText) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = j.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("empty");
    parsedJson = extractJsonObject(content);
  } catch {
    throw new Error("OpenAI: could not parse model output");
  }

  const parsed = outlineSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`OpenAI: invalid shape — ${parsed.error.message}`);
  }
  const o = parsed.data;
  return {
    ...o,
    course_type: o.course_type ?? "skill",
    category: o.category?.trim() || undefined,
    lessons: o.lessons.map((l) => ({
      ...l,
      video_url: l.video_url ?? null,
      code_template: l.code_template ?? null,
    })),
  };
}

/** Khi API lỗi — trả về khóa mẫu để GV chỉnh sửa trước khi lưu. */
export function buildFallbackCourseOutline(topic: string): GeneratedCourseOutline {
  const t = topic.trim() || "Khóa học mới";
  const cat = t.length > 40 ? `${t.slice(0, 37)}…` : t;
  return {
    course_title: t.slice(0, 200),
    course_description:
      `Đây là bản nháp tự động cho chủ đề "${t}". Nội dung do hệ thống tạo khi AI không khả dụng — vui lòng chỉnh sửa đầy đủ trước khi xuất bản.`,
    course_type: "skill",
    category: cat.slice(0, 80),
    lessons: [
      {
        title: "Bài 1: Giới thiệu",
        content:
          "## Mục tiêu\n\n- Làm quen với chủ đề khóa học.\n\n## Nội dung\n\n(Thay thế bằng nội dung thực tế.)",
        video_url: null,
        code_template: null,
      },
      {
        title: "Bài 2: Khái niệm cốt lõi",
        content:
          "## Lý thuyết\n\n- Định nghĩa và thuật ngữ.\n\n## Ví dụ\n\n(Thêm ví dụ minh họa.)",
        video_url: null,
        code_template: null,
      },
      {
        title: "Bài 3: Thực hành",
        content:
          "## Bài tập\n\n1. Hoàn thành các bước sau…\n\n## Gợi ý\n\n(Ghi chú cho học sinh.)",
        video_url: null,
        code_template: null,
      },
      {
        title: "Bài 4: Tổng kết",
        content:
          "## Ôn tập\n\n- Tóm tắt kiến thức.\n\n## Tiếp theo\n\n(Hướng dẫn học thêm.)",
        video_url: null,
        code_template: null,
      },
    ],
  };
}
