import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().uuid(),
  is_read: z.boolean(),
});

/** Danh sách thông báo của user hiện tại (teacher/admin). */
export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("notifications")
    .select("id, type, title, content, link, is_read, created_at")
    .eq("user_id", gate.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

/** Đánh dấu đã đọc một thông báo. */
export async function PATCH(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error } = await gate.supabase
    .from("notifications")
    .update({ is_read: parsed.data.is_read })
    .eq("id", parsed.data.id)
    .eq("user_id", gate.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
