import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { createExerciseApiSchema } from "@/lib/validations/exercise";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

function zodMessage(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`)
    .join(" • ");
}

function optText(v: string | undefined): string | null {
  if (v === undefined) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * GET /api/admin/exercises?lessonId=<uuid>
 */
export async function GET(request: Request) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const lessonIdRaw = searchParams.get("lessonId");
  const lessonParsed = z.string().uuid("lessonId không hợp lệ").safeParse(lessonIdRaw);
  if (!lessonParsed.success) {
    return NextResponse.json({ error: zodMessage(lessonParsed.error) }, { status: 400 });
  }
  const lessonId = lessonParsed.data;

  const { data: lesson, error: lessonErr } = await admin.supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonErr) {
    return NextResponse.json({ error: lessonErr.message }, { status: 500 });
  }
  if (!lesson) {
    return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
  }

  const { data: exercises, error } = await admin.supabase
    .from("exercises")
    .select(
      "id, lesson_id, title, description, hint_logic, code_hint, initial_code, sample_input, sample_output, language, order_index, created_at"
    )
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exercises: exercises ?? [] });
}

/**
 * POST /api/admin/exercises
 */
export async function POST(request: Request) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON." }, { status: 400 });
  }

  const parsed = createExerciseApiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;

  const { data: lesson, error: lessonErr } = await admin.supabase
    .from("lessons")
    .select("id")
    .eq("id", body.lesson_id)
    .maybeSingle();

  if (lessonErr) {
    return NextResponse.json({ error: lessonErr.message }, { status: 500 });
  }
  if (!lesson) {
    return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
  }

  const insert = {
    lesson_id: body.lesson_id,
    title: body.title.trim(),
    description: optText(body.description),
    hint_logic: optText(body.hint_logic),
    code_hint: optText(body.code_hint),
    initial_code: optText(body.initial_code),
    sample_input: optText(body.sample_input),
    sample_output: optText(body.sample_output),
    language: body.language,
    order_index: body.order_index,
  };

  const { data: exercise, error } = await admin.supabase
    .from("exercises")
    .insert(insert)
    .select(
      "id, lesson_id, title, description, hint_logic, code_hint, initial_code, sample_input, sample_output, language, order_index, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/admin/lessons/${body.lesson_id}/exercises`);
  return NextResponse.json({ exercise });
}
