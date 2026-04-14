import OpenAI from "openai";

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function isOpenAiSolutionAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function stripCodeFences(raw: string): string {
  let t = raw.trim();
  const m = /^```(?:\w+)?\s*([\s\S]*?)```$/m.exec(t);
  if (m) return m[1].trim();
  return t;
}

export async function generatePracticeSolutionCode(params: {
  language: string;
  description?: string | null;
  inputExample?: string | null;
  outputExample?: string | null;
}): Promise<string> {
  const openai = getClient();
  if (!openai) {
    throw new Error("OPENAI_API_KEY chưa cấu hình");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const parts = [
    `Ngôn ngữ: ${params.language}`,
    params.description?.trim() ? `Đề bài:\n${params.description.trim().slice(0, 3000)}` : "",
    params.inputExample?.trim() ? `Input mẫu:\n${params.inputExample.trim().slice(0, 800)}` : "",
    params.outputExample?.trim() ? `Output mong đợi:\n${params.outputExample.trim().slice(0, 800)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý lập trình. Chỉ trả về mã nguồn hoàn chỉnh có thể chạy, không giải thích, không markdown, không bọc ```.",
        },
        {
          role: "user",
          content: `Viết code giải bài sau bằng ${params.language}. Đáp ứng đúng input/output nếu có.\n\n${parts}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    },
    { signal: AbortSignal.timeout(45_000) }
  );

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("AI không trả về code");
  return stripCodeFences(text);
}
