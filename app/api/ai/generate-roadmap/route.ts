import { createEmbedding } from "@/lib/rag/openai-embeddings";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const bodySchema = z.object({
  goal: z.string().min(1).max(2000),
  timeframe: z.string().min(1).max(500),
  additionalNotes: z.string().max(4000).optional().nullable(),
});

const moduleSchema = z.object({
  name: z.string(),
  lessons: z.array(z.string()),
  duration_days: z.coerce.number(),
});

const roadmapJsonSchema = z.object({
  title: z.string(),
  modules: z.array(moduleSchema),
  total_duration_days: z.coerce.number(),
  reasoning: z.string(),
});

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fence?.[1]?.trim() ?? t;
  return JSON.parse(inner);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("mbti_type, career_orientation, assessment_completed")
    .eq("id", user.id)
    .single();

  if (pErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.assessment_completed !== true) {
    return NextResponse.json(
      { error: "Hoàn thành trắc nghiệm định hướng trước khi dùng tính năng này." },
      { status: 403 }
    );
  }

  const { data: orientation } = await supabase
    .from("career_orientations")
    .select("mbti_type, strengths, weaknesses, suggested_careers")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mbti =
    (orientation?.mbti_type as string | null)?.trim() ||
    (profile.mbti_type as string | null)?.trim() ||
    "—";
  const careerOrientation =
    (profile.career_orientation as string | null)?.trim() || "—";

  const ragQuery = [
    body.goal,
    body.timeframe,
    body.additionalNotes ?? "",
    `MBTI: ${mbti}`,
    `Định hướng nghề (profile): ${careerOrientation}`,
  ]
    .filter(Boolean)
    .join("\n");

  let queryEmbedding: number[];
  try {
    queryEmbedding = await createEmbedding(ragQuery);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Embedding failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const { data: ragRows, error: ragErr } = await supabase.rpc(
    "match_roadmap_embeddings",
    {
      query_embedding: queryEmbedding,
      match_count: 8,
    }
  );

  if (ragErr) {
    return NextResponse.json({ error: ragErr.message }, { status: 500 });
  }

  const chunks = (ragRows ?? []) as { content: string; similarity: number }[];
  const context =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `[Đoạn ${i + 1}, độ tương đồng ${c.similarity.toFixed(3)}]\n${c.content}`
          )
          .join("\n\n---\n\n")
      : "(Chưa có tài liệu roadmap được nhúng trong CSDL — hãy chạy scripts/ingest-roadmap.ts.)";

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const userPrompt = `Bạn là chuyên gia giáo dục lập trình. Dựa trên thông tin học sinh:
- MBTI: ${mbti}
- Định hướng nghề (tóm tắt): ${careerOrientation}
- Mục tiêu: ${body.goal}
- Thời gian: ${body.timeframe}
- Ghi chú: ${body.additionalNotes ?? "—"}
${orientation?.strengths?.length ? `- Điểm mạnh (từ trắc nghiệm): ${(orientation.strengths as string[]).join("; ")}` : ""}
${orientation?.weaknesses?.length ? `- Cần cải thiện: ${(orientation.weaknesses as string[]).join("; ")}` : ""}

Và dựa trên kiến thức từ các roadmap dưới đây, hãy tạo một lộ trình học tập cá nhân hóa chi tiết (các module, bài học, tài liệu tham khảo, thời gian dự kiến).

Kiến thức tham khảo:
${context}

Trả về **một object JSON duy nhất** (không markdown), đúng schema:
{
  "title": "Tên lộ trình",
  "modules": [
    { "name": "Module 1", "lessons": ["Bài 1", "Bài 2"], "duration_days": 7 }
  ],
  "total_duration_days": 30,
  "reasoning": "Giải thích tại sao chọn lộ trình này"
}`;

  const chatRes = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Bạn trả lời bằng JSON hợp lệ theo đúng schema mà người dùng yêu cầu. Ngôn ngữ: tiếng Việt.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
    }),
  });

  const chatJson = (await chatRes.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!chatRes.ok) {
    return NextResponse.json(
      { error: chatJson.error?.message ?? `OpenAI HTTP ${chatRes.status}` },
      { status: 502 }
    );
  }

  const rawContent = chatJson.choices?.[0]?.message?.content;
  if (!rawContent) {
    return NextResponse.json({ error: "Empty model response" }, { status: 502 });
  }

  let parsedRoadmap: z.infer<typeof roadmapJsonSchema>;
  try {
    parsedRoadmap = roadmapJsonSchema.parse(extractJsonObject(rawContent));
  } catch {
    return NextResponse.json(
      { error: "Model trả về JSON không đúng định dạng." },
      { status: 502 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("custom_roadmaps")
    .insert({
      user_id: user.id,
      title: parsedRoadmap.title,
      modules: parsedRoadmap.modules,
      total_duration_days: Math.round(parsedRoadmap.total_duration_days),
      reasoning: parsedRoadmap.reasoning,
      status: "draft",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Không lưu được custom_roadmaps" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: inserted.id as string,
    roadmap: parsedRoadmap,
    ragChunksUsed: chunks.length,
  });
}
