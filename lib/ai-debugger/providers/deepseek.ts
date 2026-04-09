import type { AIDebugResponse } from "../types";
import { z } from "zod";

const aidSchema = z.object({
  errorType: z.enum(["Critical", "Warning", "Optimization"]),
  title: z.string(),
  visualDiff: z
    .object({
      before: z.string(),
      after: z.string(),
    })
    .optional(),
  rootCause: z.string(),
  solution: z.string(),
  impact: z.string(),
  improvements: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `Bạn là trợ lý debug lập trình. Trả về DUY NHẤT một object JSON hợp lệ, không markdown, không văn bản ngoài JSON.

Schema:
{
  "errorType": "Critical" | "Warning" | "Optimization",
  "title": "string",
  "visualDiff": { "before": "string", "after": "string" } (tùy chọn nhưng nên có),
  "rootCause": "string (tiếng Việt)",
  "solution": "string (tiếng Việt)",
  "impact": "string — hậu quả 1 tuần / 1 tháng / 1 nếu không sửa (tiếng Việt)",
  "improvements": ["string", ...] (tùy chọn)
}

Quy tắc: C++ memory leak → smart pointer; JS async → async/await; Python def f(x=[]) → None.`;

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

function parseAidJson(content: string): AIDebugResponse {
  const t = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const jsonStr = fence ? fence[1].trim() : t;
  const raw: unknown = JSON.parse(jsonStr);
  return aidSchema.parse(raw);
}

/**
 * @throws nếu thiếu key, HTTP lỗi, timeout (do caller), hoặc JSON không hợp lệ
 */
export async function callDeepseek(
  userPrompt: string,
  signal: AbortSignal
): Promise<AIDebugResponse> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY missing");
  }

  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 400);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      detail = j.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Deepseek ${res.status}: ${detail}`);
  }

  const data = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Deepseek: empty content");
  }

  try {
    return parseAidJson(content);
  } catch (e) {
    throw new Error(
      `Deepseek JSON invalid: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
