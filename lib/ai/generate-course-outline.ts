import { z } from "zod";

const lessonSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  video_url: z
    .preprocess((v) => (v === "" || v === undefined ? null : v), z.string().nullable())
    .optional(),
});

const outlineSchema = z.object({
  course_title: z.string().min(1),
  course_description: z.string(),
  lessons: z.array(lessonSchema).min(3).max(24),
});

export type GeneratedCourseOutline = z.infer<typeof outlineSchema>;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fence?.[1]?.trim() ?? t;
  return JSON.parse(inner);
}

/** Generate a course outline from extracted PDF/text plus topic. Server-only. */
export async function generateCourseOutlineFromText(args: {
  topic: string;
  title?: string;
  description?: string;
  sourceText: string;
}): Promise<GeneratedCourseOutline> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const preamble = [
    args.title ? `Suggested title: ${args.title}` : null,
    args.description ? `Suggested description: ${args.description}` : null,
    `Main topic: ${args.topic}`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `You are an expert curriculum designer. Output ONLY valid JSON (no markdown outside JSON) with this shape:
{"course_title":"string","course_description":"string","lessons":[{"title":"string","content":"string (markdown lesson body)","video_url":null or a plausible https URL placeholder}]}
Rules:
- lessons: between 4 and 12 items unless the source is very short; prefer 6–10.
- content: substantive markdown (headings, bullet points) suitable for students.
- video_url: usually null unless a real URL appears in the source text.
- Language: Vietnamese for titles and lesson content.`;

  const user = `${preamble}\n\n--- Source material ---\n${args.sourceText.slice(0, 120_000)}`;

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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
  return parsed.data;
}
