import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type NextSuggestion = {
  suggested_language: "python" | "java" | "cpp";
  suggested_difficulty: "easy" | "medium" | "hard";
  reason: string;
  recent_attempts?: number;
  approx_success_rate?: number;
};

const suggestionSchema = z.object({
  suggested_language: z.enum(["python", "java", "cpp"]),
  suggested_difficulty: z.enum(["easy", "medium", "hard"]),
  reason: z.string().min(1),
});

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function parseJson(content: string): unknown {
  const t = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  return JSON.parse(fence ? fence[1].trim() : t);
}

function ruleBasedSuggestion(
  dominantLang: "python" | "java" | "cpp" | null,
  successRate: number,
  attempts: number
): NextSuggestion {
  const lang = dominantLang ?? "python";
  let difficulty: "easy" | "medium" | "hard" = "medium";
  if (attempts < 3) {
    difficulty = "easy";
  } else if (successRate >= 0.65) {
    difficulty = "hard";
  } else if (successRate <= 0.35) {
    difficulty = "easy";
  }
  const reason =
    attempts === 0
      ? "Chưa có lịch sử luyện tập — bắt đầu với bài dễ để làm quen."
      : successRate >= 0.65
        ? "Bạn chạy code thành công khá ổn — thử nâng độ khó."
        : successRate <= 0.35
          ? "Có nhiều lần chưa chạy đúng — nên ôn lại bài dễ hơn."
          : "Tiếp tục với mức trung bình để cân bằng.";

  return {
    suggested_language: lang,
    suggested_difficulty: difficulty,
    reason,
    recent_attempts: attempts,
    approx_success_rate: Math.round(successRate * 100) / 100,
  };
}

/**
 * Phân tích lịch sử practice_submissions (có exercise_id + join language).
 */
export async function computePracticeStats(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<{
  attempts: number;
  successRate: number;
  dominantLang: "python" | "java" | "cpp" | null;
  summaryLines: string[];
}> {
  const { data: rows, error } = await supabase
    .from("practice_submissions")
    .select("error, output, exercise_id")
    .eq("user_id", userId)
    .not("exercise_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) {
    return { attempts: 0, successRate: 0, dominantLang: null, summaryLines: [] };
  }

  const exIds = Array.from(
    new Set(
      rows
        .map((r) => r.exercise_id as string | null)
        .filter((id): id is string => !!id)
    )
  );

  const exMap = new Map<
    string,
    { language: string | null; difficulty: string | null }
  >();
  if (exIds.length > 0) {
    const { data: exRows } = await supabase
      .from("practice_exercises")
      .select("id, language, difficulty")
      .in("id", exIds);
    for (const e of exRows ?? []) {
      exMap.set(e.id as string, {
        language: (e.language as string | null) ?? null,
        difficulty: (e.difficulty as string | null) ?? null,
      });
    }
  }

  const langCount = new Map<string, number>();
  let ok = 0;
  const lines: string[] = [];

  for (const r of rows) {
    const ex = r.exercise_id ? exMap.get(r.exercise_id as string) : undefined;
    const lang = ex?.language ?? "unknown";
    const diff = ex?.difficulty ?? "?";
    langCount.set(lang, (langCount.get(lang) ?? 0) + 1);

    const err = (r.error as string | null) ?? "";
    const out = (r.output as string | null) ?? "";
    const success = !err.trim() && out.trim().length > 0;
    if (success) ok += 1;
    lines.push(`- ${lang}/${diff}: ${success ? "OK" : "cần cải thiện"}`);
  }

  let dominantLang: "python" | "java" | "cpp" | null = null;
  let best = 0;
  for (const [l, c] of Array.from(langCount.entries())) {
    if (l === "python" || l === "java" || l === "cpp") {
      if (c > best) {
        best = c;
        dominantLang = l;
      }
    }
  }

  return {
    attempts: rows.length,
    successRate: rows.length ? ok / rows.length : 0,
    dominantLang,
    summaryLines: lines.slice(0, 12),
  };
}

export async function suggestNextWithOpenAI(
  stats: Awaited<ReturnType<typeof computePracticeStats>>,
  signal?: AbortSignal
): Promise<NextSuggestion | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const userContent = `Dựa trên lịch sử làm bài gần đây của học sinh (tối đa ${stats.attempts} lượt có exercise), tỷ lệ chạy không lỗi khoảng ${Math.round(stats.successRate * 100)}%, ngôn ngữ hay dùng: ${stats.dominantLang ?? "chưa rõ"}.

Chi tiết (rút gọn):
${stats.summaryLines.join("\n") || "(chưa có)"}

Hãy gợi ý một bài tập tiếp theo (ngôn ngữ, độ khó, chủ đề ngắn) và lý do ngắn gọn.
Trả về DUY NHẤT JSON: {"suggested_language":"python"|"java"|"cpp","suggested_difficulty":"easy"|"medium"|"hard","reason":"string tiếng Việt"}`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Bạn là cố vấn học tập lập trình. Chỉ trả về JSON hợp lệ.",
          },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
      signal,
    });

    const text = await res.text();
    if (!res.ok) return null;
    const body = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = suggestionSchema.safeParse(parseJson(content));
    if (!parsed.success) return null;
    return {
      ...parsed.data,
      recent_attempts: stats.attempts,
      approx_success_rate: Math.round(stats.successRate * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function getNextPracticeSuggestion(
  supabase: SupabaseClient,
  userId: string
): Promise<NextSuggestion> {
  const stats = await computePracticeStats(supabase, userId);
  const fromAi = await suggestNextWithOpenAI(stats);
  if (fromAi) return fromAi;
  return ruleBasedSuggestion(
    stats.dominantLang,
    stats.successRate,
    stats.attempts
  );
}
