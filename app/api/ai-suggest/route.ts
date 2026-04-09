import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string(),
  error: z.string(),
  language: z.string(),
});

const AI_DAILY_LIMIT = 3;

/** Rate limit tạm thời in-memory: key = userId|YYYY-MM-DD → số lần đã dùng thành công hôm nay */
const dailyAiUsage = new Map<string, number>();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function memoryRateKey(userId: string): string {
  return `${userId}|${todayStr()}`;
}

function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type OpenAIErrorBody = {
  error?: { message?: string; type?: string; code?: string };
};

type OpenAISuccessBody = {
  choices?: { message?: { content?: string } }[];
};

function messageForOpenAIError(status: number, body: OpenAIErrorBody): string {
  const err = body.error;
  const msg = (err?.message ?? "").trim();
  const type = (err?.type ?? "").toLowerCase();
  const lower = msg.toLowerCase();

  if (status === 401) {
    return "Lỗi API: key OpenAI không hợp lệ hoặc hết hạn. Kiểm tra OPENAI_API_KEY trên server.";
  }
  if (status === 403) {
    return "Lỗi API: OpenAI từ chối quyền truy cập (403).";
  }
  if (status === 429) {
    if (
      type === "insufficient_quota" ||
      lower.includes("quota") ||
      lower.includes("billing")
    ) {
      return "Lỗi API: hết quota hoặc hạn mức OpenAI (billing). Kiểm tra tài khoản và thanh toán trên OpenAI.";
    }
    return "Lỗi API: OpenAI đang giới hạn tần suất (rate limit). Thử lại sau vài giây.";
  }
  if (status === 400 && msg) {
    return `Lỗi API: yêu cầu không hợp lệ — ${msg}`;
  }
  if (msg) {
    return `Lỗi API: ${msg}`;
  }
  return `Lỗi API: HTTP ${status}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server chưa cấu hình OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { code, error: errText, language } = parsed.data;

  const ip = getClientIp(request);
  const rateKey = memoryRateKey(user.id);
  const usedToday = dailyAiUsage.get(rateKey) ?? 0;
  if (usedToday >= AI_DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Đã hết ${AI_DAILY_LIMIT} lượt hỏi AI hôm nay (giới hạn tạm thời). Thử lại vào ngày mai.`,
      },
      { status: 429 }
    );
  }

  const requestBody = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system" as const,
        content:
          "Bạn là trợ lý dạy lập trình. Chỉ ra lỗi, giải thích nguyên nhân, gợi ý hướng sửa. Sẽ đưa ra đáp án chính xác và phân tích nguyên nhân. Trả lời bằng tiếng Việt ngắn gọn.",
      },
      {
        role: "user" as const,
        content: `Code:\n${code}\nLỗi:\n${errText}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  };

  console.log("[ai-suggest] OpenAI request (no key):", {
    model: requestBody.model,
    messageRoles: requestBody.messages.map((m) => m.role),
    codeLength: code.length,
    errorLength: errText.length,
    language,
    userId: user.id,
    ip,
  });

  let suggestion: string;

  try {
    const oaiRes = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[ai-suggest] OpenAI response status:", oaiRes.status);

    const rawText = await oaiRes.text();
    let oaiBody: OpenAIErrorBody & OpenAISuccessBody;
    try {
      oaiBody = rawText ? (JSON.parse(rawText) as typeof oaiBody) : {};
    } catch {
      return NextResponse.json(
        { error: "Lỗi API: phản hồi OpenAI không phải JSON hợp lệ." },
        { status: 502 }
      );
    }

    if (oaiRes.status !== 200) {
      const userMsg = messageForOpenAIError(oaiRes.status, oaiBody);
      console.error(
        "[ai-suggest] OpenAI error body:",
        oaiBody.error?.message ?? oaiRes.statusText
      );
      return NextResponse.json({ error: userMsg }, { status: 502 });
    }

    suggestion =
      oaiBody.choices?.[0]?.message?.content?.trim() ?? "Không có phản hồi.";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed";
    console.error("[ai-suggest] fetch exception:", msg);
    return NextResponse.json(
      { error: `Lỗi API: không kết nối được OpenAI — ${msg}` },
      { status: 502 }
    );
  }

  dailyAiUsage.set(rateKey, usedToday + 1);

  const { error: subErr } = await supabase.from("code_submissions").insert({
    user_id: user.id,
    code,
    language,
    output: null,
    error: errText || null,
    ai_suggestion: suggestion,
  });

  if (subErr) {
    console.error("[ai-suggest] insert code_submissions:", subErr.message);
  }

  return NextResponse.json({ suggestion });
}
