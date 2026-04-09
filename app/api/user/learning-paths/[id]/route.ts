import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const putBodySchema = z.object({
  status: z.literal("completed"),
});

/**
 * PUT /api/user/learning-paths/[id] — chỉ chuyển sang completed, không revert.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const idParsed = z.string().uuid().safeParse(params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "ID không hợp lệ." }, { status: 400 });
  }
  const pathId = idParsed.data;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON." }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Chỉ cho phép status: \"completed\"." },
      { status: 400 }
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from("learning_paths")
    .select("id, student_id, status")
    .eq("id", pathId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Không tìm thấy lộ trình." }, { status: 404 });
  }
  if (row.student_id !== user.id) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  if (row.status === "completed") {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  const { error: upErr } = await supabase
    .from("learning_paths")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", pathId)
    .eq("student_id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
