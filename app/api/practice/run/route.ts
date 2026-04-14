import {
  analyzeCodeError,
  formatErrorAnalysisMarkdown,
  type AnalysisSource,
  type ErrorAnalysis,
} from "@/lib/ai/error-analyzer";
import { executeCode, type RunCodeLanguage } from "@/lib/code-runner";
import { getPublishedLessonIfEnrolled } from "@/lib/practice/assert-lesson-access";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    exercise_id: z.string().uuid().optional().nullable(),
    lesson_id: z.string().uuid().optional().nullable(),
    code: z.string(),
    language: z.enum(["python", "cpp", "java"]),
    stdin: z.string().optional().default(""),
    include_ai: z.boolean().optional().default(false),
  })
  .superRefine((val, ctx) => {
    const hasEx = !!val.exercise_id?.trim();
    const hasLe = !!val.lesson_id?.trim();
    if (!hasEx && !hasLe) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cần exercise_id hoặc lesson_id",
      });
    }
    if (hasEx && hasLe) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chỉ gửi một trong exercise_id hoặc lesson_id",
      });
    }
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

  const { exercise_id, lesson_id, code, language, stdin, include_ai } =
    parsed.data;

  let inputExample: string | undefined;
  let expectedOutput: string | undefined;

  if (exercise_id) {
    const { data: exercise, error: exErr } = await supabase
      .from("practice_exercises")
      .select("id, language, input_example, output_example")
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
    inputExample = exercise.input_example?.trim() || undefined;
    expectedOutput = exercise.output_example?.trim() || undefined;
  } else if (lesson_id) {
    const lesson = await getPublishedLessonIfEnrolled(
      supabase,
      user.id,
      lesson_id
    );
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found or not enrolled" },
        { status: 404 }
      );
    }
    if (!lesson.code_template?.trim()) {
      return NextResponse.json(
        { error: "Lesson has no coding exercise" },
        { status: 400 }
      );
    }
  }

  const result = await executeCode({
    code,
    language: language as RunCodeLanguage,
    stdin,
  });

  let aiSuggestion: string | null = null;
  let analysis: ErrorAnalysis | null = null;
  let analysisSource: AnalysisSource | null = null;
  if (include_ai) {
    try {
      const r = await analyzeCodeError(code, language, {
        stderr: result.error?.trim() || undefined,
        stdout: result.output?.trim() || undefined,
        inputExample,
        expectedOutput,
      });
      analysis = r.analysis;
      analysisSource = r.source;
      aiSuggestion = formatErrorAnalysisMarkdown(r.analysis);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[practice/run] AI:", msg);
    }
  }

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    code,
    output: result.output || null,
    error: result.error || null,
    ai_suggestion: aiSuggestion,
  };

  if (exercise_id) {
    insertRow.exercise_id = exercise_id;
    insertRow.lesson_id = null;
  } else {
    insertRow.exercise_id = null;
    insertRow.lesson_id = lesson_id;
  }

  const { data: row, error: insErr } = await supabase
    .from("practice_submissions")
    .insert(insertRow)
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
    ...(include_ai
      ? { analysis, analysis_source: analysisSource }
      : {}),
    submission_id: row.id,
  });
}
