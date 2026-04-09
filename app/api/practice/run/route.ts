import {
  analyzeCodeError,
  formatAiDebugMarkdown,
} from "@/lib/ai-debugger";
import { executeCode, type RunCodeLanguage } from "@/lib/code-runner";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  exercise_id: z.string().uuid(),
  code: z.string(),
  language: z.enum(["python", "cpp", "java"]),
  stdin: z.string().optional().default(""),
  include_ai: z.boolean().optional().default(false),
});

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { exercise_id, code, language, stdin, include_ai } = parsed.data;

  const { data: exercise, error: exErr } = await supabase
    .from("practice_exercises")
    .select("id, language")
    .eq("id", exercise_id)
    .maybeSingle();

  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }
  if (exercise.language && exercise.language !== language) {
    return NextResponse.json(
      { error: "Language does not match exercise" },
      { status: 400 }
    );
  }

  const result = await executeCode({
    code,
    language: language as RunCodeLanguage,
    stdin,
  });

  let aiSuggestion: string | null = null;
  if (include_ai) {
    try {
      const analysis = await analyzeCodeError(
        code,
        result.error || result.output || "(no output)",
        language
      );
      aiSuggestion = formatAiDebugMarkdown(analysis);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[practice/run] AI:", msg);
    }
  }

  const { data: row, error: insErr } = await supabase
    .from("practice_submissions")
    .insert({
      user_id: user.id,
      exercise_id,
      code,
      output: result.output || null,
      error: result.error || null,
      ai_suggestion: aiSuggestion,
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    output: result.output,
    error: result.error,
    exit_code: result.exit_code,
    ai_suggestion: aiSuggestion,
    submission_id: row.id,
  });
}
