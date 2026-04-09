import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { updateExerciseApiSchema } from "@/lib/validations/exercise";
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

const idParamSchema = z.string().uuid("ID bài tập không hợp lệ");

/**
 * PUT /api/admin/exercises/[id]
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const params = await Promise.resolve(context.params);
  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: zodMessage(idParsed.error) }, { status: 400 });
  }
  const id = idParsed.data;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON." }, { status: 400 });
  }

  const parsed = updateExerciseApiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;

  const { data: existing, error: fetchErr } = await admin.supabase
    .from("exercises")
    .select("lesson_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing?.lesson_id) {
    return NextResponse.json({ error: "Không tìm thấy bài tập." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = optText(body.description);
  if (body.hint_logic !== undefined) patch.hint_logic = optText(body.hint_logic);
  if (body.code_hint !== undefined) patch.code_hint = optText(body.code_hint);
  if (body.initial_code !== undefined) patch.initial_code = optText(body.initial_code);
  if (body.sample_input !== undefined) patch.sample_input = optText(body.sample_input);
  if (body.sample_output !== undefined) patch.sample_output = optText(body.sample_output);
  if (body.language !== undefined) patch.language = body.language;
  if (body.order_index !== undefined) patch.order_index = body.order_index;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Không có trường cập nhật." }, { status: 400 });
  }

  const { data: exercise, error } = await admin.supabase
    .from("exercises")
    .update(patch)
    .eq("id", id)
    .select(
      "id, lesson_id, title, description, hint_logic, code_hint, initial_code, sample_input, sample_output, language, order_index, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/admin/lessons/${existing.lesson_id}/exercises`);
  return NextResponse.json({ exercise });
}

/**
 * DELETE /api/admin/exercises/[id]
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const params = await Promise.resolve(context.params);
  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: zodMessage(idParsed.error) }, { status: 400 });
  }
  const id = idParsed.data;

  const { data: existing, error: fetchErr } = await admin.supabase
    .from("exercises")
    .select("lesson_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing?.lesson_id) {
    return NextResponse.json({ error: "Không tìm thấy bài tập." }, { status: 404 });
  }

  const { error } = await admin.supabase.from("exercises").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/admin/lessons/${existing.lesson_id}/exercises`);
  return NextResponse.json({ ok: true });
}
