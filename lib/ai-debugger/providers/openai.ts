import type { AIDebugResponse } from "../types";
import { getOpenAI, hasOpenAIApiKey } from "@/lib/ai/openai-client";
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
  "impact": "string — hậu quả 1 tuần / 1 tháng / 1 năm nếu không sửa (tiếng Việt)",
  "improvements": ["string", ...] (tùy chọn)
}

Quy tắc: C++ memory leak → smart pointer; JS async → async/await; Python def f(x=[]) → None.`;

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
export async function callOpenai(
  userPrompt: string,
  signal: AbortSignal
): Promise<AIDebugResponse> {
  if (!hasOpenAIApiKey()) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-3.5-turbo";

  const completion = await getOpenAI().chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    },
    { signal }
  );

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI: empty content");
  }

  try {
    return parseAidJson(content);
  } catch (e) {
    throw new Error(
      `OpenAI JSON invalid: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
