import { completeStudyScheduleItem } from "@/lib/study-schedule/complete-item";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

/** POST — đánh dấu hoàn thành một mục lịch học (URL có id). */
export async function POST(_request: Request, { params }: Ctx) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await completeStudyScheduleItem(supabase, user.id, params.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
