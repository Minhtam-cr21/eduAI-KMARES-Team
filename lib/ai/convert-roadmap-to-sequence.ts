import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CourseSequenceRow = {
  course_id: string;
  order_index: number;
  due_date_offset_days: number;
};

type RoadmapLike = {
  title: string | null;
  modules: unknown;
  reasoning: string | null;
  total_duration_days: number | null;
};

type CourseCatalogRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
};

type ModuleItem = { name: string; lessons: string[]; duration_days: number };

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fence?.[1]?.trim() ?? t;
  return JSON.parse(inner) as unknown;
}

function parseModules(raw: unknown): ModuleItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ModuleItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const duration_days =
      typeof o.duration_days === "number"
        ? o.duration_days
        : Number(o.duration_days);
    const lessons = Array.isArray(o.lessons)
      ? o.lessons.filter((x): x is string => typeof x === "string")
      : [];
    if (!name) continue;
    out.push({
      name,
      lessons,
      duration_days: Number.isFinite(duration_days) ? Math.max(1, duration_days) : 7,
    });
  }
  return out;
}

function normalizeSequence(
  items: { course_id: string; order_index: number; due_date_offset_days?: number }[],
  validIds: Set<string>
): CourseSequenceRow[] {
  const rows = items
    .filter((r) => validIds.has(r.course_id))
    .map((r, i) => ({
      course_id: r.course_id,
      order_index: Number.isFinite(r.order_index) ? r.order_index : i,
      due_date_offset_days:
        typeof r.due_date_offset_days === "number" &&
        Number.isFinite(r.due_date_offset_days)
          ? Math.max(1, Math.round(r.due_date_offset_days))
          : 7 * (i + 1),
    }))
    .sort((a, b) => a.order_index - b.order_index);

  let prev = 0;
  return rows.map((r, i) => {
    const days = r.due_date_offset_days;
    const due = days > prev ? days : prev + 7;
    prev = due;
    return {
      course_id: r.course_id,
      order_index: i,
      due_date_offset_days: due,
    };
  });
}

function scoreMatch(moduleName: string, courseTitle: string): number {
  const a = moduleName.toLowerCase().trim();
  const b = courseTitle.toLowerCase().trim();
  if (!a || !b) return 0;
  if (b.includes(a) || a.includes(b)) return 100;
  const aw = new Set(a.split(/\s+/).filter((w) => w.length > 2));
  const bw = b.split(/\s+/).filter((w) => w.length > 2);
  let hit = 0;
  for (const w of bw) {
    if (aw.has(w)) hit++;
  }
  return hit;
}

function fallbackSequenceFromModules(
  modules: ModuleItem[],
  catalog: CourseCatalogRow[]
): CourseSequenceRow[] {
  const picked: string[] = [];
  for (const m of modules) {
    let bestId: string | null = null;
    let best = 0;
    for (const c of catalog) {
      const s = scoreMatch(m.name, c.title);
      if (s > best) {
        best = s;
        bestId = c.id;
      }
      for (const lesson of m.lessons) {
        const s2 = scoreMatch(lesson, c.title);
        if (s2 > best) {
          best = s2;
          bestId = c.id;
        }
      }
    }
    if (bestId && best >= 20 && !picked.includes(bestId)) {
      picked.push(bestId);
    }
  }

  let offset = 0;
  return picked.map((course_id, i) => {
    const mod = modules[i] ?? modules[modules.length - 1];
    const span = mod ? mod.duration_days : 7;
    offset += Math.max(1, span);
    return {
      course_id,
      order_index: i,
      due_date_offset_days: offset,
    };
  });
}

async function openAiSuggestSequence(
  roadmap: RoadmapLike,
  catalog: CourseCatalogRow[]
): Promise<{ course_id: string; order_index: number; due_date_offset_days?: number }[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return [];

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const modules = parseModules(roadmap.modules);
  const catalogLines = catalog
    .map(
      (c) =>
        `- id: ${c.id} | title: ${c.title} | category: ${c.category}${c.description ? ` | ${c.description.slice(0, 200)}` : ""}`
    )
    .join("\n");

  const userPrompt = `Bạn là trợ lý lập lộ trình học. Dựa trên lộ trình AI (tiêu đề, module, bài học, lý do) và danh sách khóa học đã xuất bản dưới đây, hãy chọn các khóa phù hợp và trả về course_sequence.

Lộ trình:
- title: ${roadmap.title ?? "—"}
- total_duration_days: ${roadmap.total_duration_days ?? "—"}
- reasoning: ${roadmap.reasoning ?? "—"}
- modules (JSON gợi ý): ${JSON.stringify(modules)}

Khóa học có sẵn (chỉ được dùng course_id từ danh sách này):
${catalogLines || "(Không có khóa published)"}

Trả về một object JSON duy nhất:
{
  "courseSequence": [
    { "course_id": "<uuid từ danh sách>", "order_index": 0, "due_date_offset_days": 7 }
  ],
  "note": "Nếu thiếu khóa phù hợp, gợi ý ngắn (tiếng Việt)."
}

Quy tắc:
- order_index tăng dần từ 0.
- due_date_offset_days: số ngày tích lũy từ hiện tại đến khi xong khóa đó (số nguyên >= 1), phù hợp duration của module tương ứng nếu có.
- Không bịa course_id; nếu không khớp, courseSequence có thể rỗng và note giải thích.`;

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
            "Bạn trả lời bằng JSON hợp lệ. Chỉ dùng course_id từ danh sách được cung cấp. Ngôn ngữ: tiếng Việt.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  const chatJson = (await chatRes.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!chatRes.ok) {
    console.warn(
      "[convert-roadmap-to-sequence] OpenAI:",
      chatJson.error?.message ?? chatRes.status
    );
    return [];
  }

  const rawContent = chatJson.choices?.[0]?.message?.content;
  if (!rawContent) return [];

  let parsed: unknown;
  try {
    parsed = extractJsonObject(rawContent);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object") return [];
  const seq = (parsed as Record<string, unknown>).courseSequence;
  if (!Array.isArray(seq)) return [];

  const out: { course_id: string; order_index: number; due_date_offset_days?: number }[] = [];
  for (const item of seq) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const course_id = typeof o.course_id === "string" ? o.course_id : "";
    const order_index =
      typeof o.order_index === "number" ? o.order_index : Number(o.order_index);
    const due_date_offset_days =
      typeof o.due_date_offset_days === "number"
        ? o.due_date_offset_days
        : Number(o.due_date_offset_days);
    if (!course_id || !Number.isFinite(order_index)) continue;
    out.push({
      course_id,
      order_index,
      due_date_offset_days: Number.isFinite(due_date_offset_days)
        ? Math.round(due_date_offset_days)
        : undefined,
    });
  }
  return out;
}

/**
 * Lấy danh sách khóa published và đề xuất course_sequence (OpenAI + fallback theo tên module).
 */
export async function buildCourseSequenceFromRoadmap(
  roadmap: RoadmapLike
): Promise<CourseSequenceRow[]> {
  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }

  const { data: courses, error } = await admin
    .from("courses")
    .select("id, title, category, description")
    .eq("status", "published");

  if (error) {
    throw new Error(error.message);
  }

  const catalog = (courses ?? []) as CourseCatalogRow[];
  const validIds = new Set(catalog.map((c) => c.id));

  const fromAi = await openAiSuggestSequence(roadmap, catalog);
  let normalized = normalizeSequence(fromAi, validIds);

  if (normalized.length === 0) {
    const modules = parseModules(roadmap.modules);
    normalized = fallbackSequenceFromModules(modules, catalog);
  }

  return normalized;
}
