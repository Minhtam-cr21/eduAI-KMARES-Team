import { createClient } from "@/lib/supabase/server";
import { touchLastActivity } from "@/lib/user/record-activity";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** POST — ghi nhận học sinh đang học (cập nhật profiles.last_activity_at). */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await touchLastActivity(supabase, user.id);
  return NextResponse.json({ ok: true });
}
