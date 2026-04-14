import { analyzeCodeWithAI } from "@/lib/ai/code-mentor";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string(),
  language: z.string(),
  error: z.string().optional(),
  output: z.string().optional(),
  context: z
    .object({
      projectFiles: z
        .array(
          z.object({
            path: z.string(),
            content: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
});

const AI_DAILY_LIMIT = 3;
const dailyAiUsage = new Map<string, number>();

function memoryRateKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${userId}|${day}`;
}

function extraContextFromBody(
  context: z.infer<typeof bodySchema>["context"]
): string | undefined {
  const files = context?.projectFiles;
  if (!files?.length) return undefined;
  return files
    .map(
      (f) =>
        `--- ${f.path} ---\n${f.content.slice(0, 4000)}${f.content.length > 4000 ? "\n…" : ""}`
    )
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      console.error("[ai-suggest] Invalid JSON body");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[ai-suggest] Validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { code, language, error, output, context } = parsed.data;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateKey = memoryRateKey(user.id);
    const usedToday = dailyAiUsage.get(rateKey) ?? 0;
    if (usedToday >= AI_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `Đã hết ${AI_DAILY_LIMIT} lượt hỏi AI hôm nay. Thử lại vào ngày mai.`,
        },
        { status: 429 }
      );
    }

    const suggestion = await analyzeCodeWithAI({
      code,
      language,
      error,
      output,
      extraContext: extraContextFromBody(context),
    });

    dailyAiUsage.set(rateKey, usedToday + 1);

    const errLine = error?.trim() || null;
    const outLine = output?.trim() || null;

    const { error: subErr } = await supabase.from("code_submissions").insert({
      user_id: user.id,
      code,
      language,
      output: outLine,
      error: errLine,
      ai_suggestion: suggestion,
    });

    if (subErr) {
      console.error("[ai-suggest] insert code_submissions:", subErr.message);
    }

    return NextResponse.json({ suggestion });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai-suggest] Route error:", err);
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
