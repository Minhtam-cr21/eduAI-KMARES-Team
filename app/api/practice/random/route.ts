import {
  generateExerciseWithOpenAI,
  getStaticFallback,
  pickExistingExerciseFromDb,
} from "@/lib/practice/generate-random-exercise";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postSchema = z.object({
  language: z.enum(["python", "java", "cpp"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

/**
 * POST — sinh bài `practice_exercises` (OpenAI → DB có sẵn → fallback tĩnh), trả object để luyện + run.
 */
export async function POST(request: Request) {
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

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { language, difficulty } = parsed.data;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25_000);
  let payload =
    (await generateExerciseWithOpenAI(language, difficulty, controller.signal)) ??
    (await pickExistingExerciseFromDb(supabase, language, difficulty)) ??
    getStaticFallback(language, difficulty);
  clearTimeout(t);

  const title = payload.title.slice(0, 200);

  let supabaseAdmin;
  try {
    supabaseAdmin = createServiceRoleClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Service role client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("practice_exercises")
    .insert({
      title,
      description: payload.description,
      initial_code: payload.initial_code_template || null,
      test_code: null,
      language,
      difficulty,
      input_example: payload.input_example || null,
      output_example: payload.output_example || null,
    })
    .select("*")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json(inserted);
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const language = req.nextUrl.searchParams.get("language") ?? "python";

  const { count, error: countErr } = await supabase
    .from("practice_questions")
    .select("id", { count: "exact", head: true })
    .eq("language", language)
    .eq("is_published", true);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const total = count ?? 0;
  if (total === 0) {
    return NextResponse.json(
      { error: `Chưa có câu hỏi cho ngôn ngữ "${language}".` },
      { status: 404 }
    );
  }

  const offset = Math.floor(Math.random() * total);

  const { data, error } = await supabase
    .from("practice_questions")
    .select("*")
    .eq("language", language)
    .eq("is_published", true)
    .range(offset, offset)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
