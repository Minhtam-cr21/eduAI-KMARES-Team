/**
 * Adds a short "typical syllabus" brief from the model's knowledge (no live web crawl).
 * Helps when the PDF extract is short or missing sections.
 */
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function enrichCourseContextFromTopic(args: {
  topic: string;
  title?: string;
  sourceHint?: string;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model =
    process.env.OPENAI_COURSE_CONTEXT_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const system = `You help design training courses. Given a topic and optional title, write a SHORT brief in Vietnamese (plain text, bullet lines OK):
- 5-10 bullets: concepts, skills, and a sensible learning order a quality course usually covers.
- Do not invent specific quotes, page numbers, or URLs.
- If the topic is vague, state reasonable assumptions.
- No JSON.`;

  const user = [
    args.title ? `Title: ${args.title}` : null,
    `Topic / goals: ${args.topic}`,
    args.sourceHint ? `Attached material note: ${args.sourceHint}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Context enrichment HTTP ${res.status}: ${rawText.slice(0, 300)}`);
  }

  const j = JSON.parse(rawText) as { choices?: { message?: { content?: string } }[] };
  const content = j.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Context enrichment: empty response");
  }
  return content;
}
