import { createClient } from "@/lib/supabase/server";
import { touchLastActivity } from "@/lib/user/record-activity";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

/** POST — đánh dấu hoàn thành một mục lịch học. */
export async function POST(_request: Request, { params }: Ctx) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;

  const { data: row, error: fetchErr } = await supabase
    .from("study_schedule")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status === "frozen") {
    return NextResponse.json(
      { error: "Mục này đang đóng băng. Liên hệ giáo viên." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("study_schedule")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await touchLastActivity(supabase, user.id);
  return NextResponse.json({ ok: true });
}
