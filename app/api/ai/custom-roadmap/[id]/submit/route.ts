import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

/**
 * POST — học sinh gửi bản nháp lộ trình AI cho trạng thái chờ giáo viên duyệt (pending).
 */
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("custom_roadmaps")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (row.status !== "draft") {
    return NextResponse.json(
      { error: "Chỉ có thể gửi duyệt khi trạng thái là draft." },
      { status: 400 }
    );
  }

  const { error: updErr } = await supabase
    .from("custom_roadmaps")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: "pending" });
}
