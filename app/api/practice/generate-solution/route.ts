import { generatePracticeSolutionCode, isOpenAiSolutionAvailable } from "@/lib/ai/generate-practice-solution";
import { getPublishedLessonIfEnrolled } from "@/lib/practice/assert-lesson-access";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    exerciseId: z.string().uuid().optional(),
    lessonId: z.string().uuid().optional(),
    language: z.string().min(1),
    description: z.string().optional(),
    inputExample: z.string().optional(),
    outputExample: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.exerciseId?.trim() && !v.lessonId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Cần exerciseId hoặc lessonId",
      });
    }
    if (v.exerciseId?.trim() && v.lessonId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Chỉ gửi một trong exerciseId hoặc lessonId",
      });
    }
  });

/**
 * POST — sinh code đáp án bằng OpenAI khi chưa có trong DB.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenAiSolutionAvailable()) {
    return NextResponse.json(
      {
        error:
          "Chưa có đáp án lưu sẵn và hệ thống chưa bật tạo đáp án tự động.",
      },
      { status: 503 }
    );
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

  const { exerciseId, lessonId, language, description, inputExample, outputExample } =
    parsed.data;

  let desc = description?.trim() || "";
  let inp = inputExample?.trim() || "";
  let out = outputExample?.trim() || "";
  let lang = language.trim();

  if (exerciseId) {
    const { data: ex, error } = await supabase
      .from("practice_exercises")
      .select("description, input_example, output_example, language, solution_code")
      .eq("id", exerciseId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!ex) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    if (ex.solution_code?.trim()) {
      return NextResponse.json({
        solution: ex.solution_code.trim(),
        source: "database" as const,
      });
    }

    if (!desc) desc = (ex.description as string | null)?.trim() || "";
    if (!inp) inp = (ex.input_example as string | null)?.trim() || "";
    if (!out) out = (ex.output_example as string | null)?.trim() || "";
    if (ex.language) lang = String(ex.language);
  } else {
    const lesson = await getPublishedLessonIfEnrolled(supabase, user.id, lessonId!);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found or not enrolled" }, { status: 404 });
    }

    if (lesson.solution_code?.trim()) {
      return NextResponse.json({
        solution: lesson.solution_code.trim(),
        source: "database" as const,
      });
    }

    if (!desc) {
      const parts = [lesson.title, lesson.content?.trim() || ""].filter(Boolean);
      desc = parts.join("\n\n").slice(0, 3000);
    }
    if (!inp && lesson.code_template?.trim()) {
      inp = `(code_template gợi ý — tham khảo cấu trúc)\n${lesson.code_template.slice(0, 600)}`;
    }
  }

  try {
    const solution = await generatePracticeSolutionCode({
      language: lang,
      description: desc || undefined,
      inputExample: inp || undefined,
      outputExample: out || undefined,
    });

    return NextResponse.json({ solution, source: "ai" as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-solution]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
