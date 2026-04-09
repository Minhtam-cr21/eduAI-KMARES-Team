import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { revalidateAdminLessonPaths } from "@/lib/admin/revalidate-lessons";
import { lessonFormSchema } from "@/lib/validations/lesson";
import { NextResponse } from "next/server";
import { z } from "zod";

function zodMessage(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`)
    .join(" • ");
}

const idParamSchema = z.string().uuid("ID bài học không hợp lệ");

/**
 * PUT /api/admin/lessons/[id]
 * Body: lessonFormSchema (title, content, video_url, order_index, is_published).
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

  const parsed = lessonFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await admin.supabase
    .from("lessons")
    .select("topic_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing?.topic_id) {
    return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
  }

  const body = parsed.data;
  const { data: lesson, error } = await admin.supabase
    .from("lessons")
    .update({
      title: body.title.trim(),
      content: body.content.trim() || null,
      video_url: body.video_url?.trim() || null,
      order_index: body.order_index,
      is_published: body.is_published,
      goals: body.goals?.length ? body.goals : [],
    })
    .eq("id", id)
    .select(
      "id, topic_id, title, content, video_url, order_index, is_published, goals, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAdminLessonPaths(existing.topic_id);
  return NextResponse.json({ lesson });
}

/**
 * DELETE /api/admin/lessons/[id]
 * Xóa lesson; exercises cascade (ON DELETE CASCADE).
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
    .from("lessons")
    .select("topic_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing?.topic_id) {
    return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
  }

  const { error } = await admin.supabase.from("lessons").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAdminLessonPaths(existing.topic_id);
  return NextResponse.json({ ok: true });
}
