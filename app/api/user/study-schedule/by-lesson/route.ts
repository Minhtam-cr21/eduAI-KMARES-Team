import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET ?lessonId= — mục study_schedule của user cho lesson (ưu tiên pending, sau đó completed).
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = request.nextUrl.searchParams.get("lessonId");
  const parsed = z.string().uuid().safeParse(lessonId);
  if (!parsed.success) {
    return NextResponse.json({ error: "lessonId không hợp lệ." }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("study_schedule")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("lesson_id", parsed.data)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const pending = list.find((r) => r.status === "pending");
  const completed = list.find((r) => r.status === "completed");
  const chosen = pending ?? completed ?? list[0] ?? null;

  if (!chosen) {
    return NextResponse.json({
      schedule_id: null,
      status: null,
      schedule: null,
    });
  }

  const id = chosen.id as string;
  const st = chosen.status as string;
  return NextResponse.json({
    schedule_id: id,
    status: st,
    schedule: { id, status: st },
  });
}
