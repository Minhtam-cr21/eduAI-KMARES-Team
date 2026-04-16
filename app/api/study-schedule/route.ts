import { isRuntimeEnvError } from "@/lib/runtime/env";
import { createClient } from "@/lib/supabase/server";
import { buildEnrichedScheduleSnapshot } from "@/lib/study-schedule/snapshot";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET — lịch học của user (kèm lesson + course để dẫn link).
 * Query: year, month (1–12) optional — lọc theo tháng; không có thì trả về tất cả.
 */
export async function GET(request: Request) {
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient();
  } catch (error) {
    if (isRuntimeEnvError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          missingEnv: error.missingEnv,
        },
        { status: 503 }
      );
    }
    throw error;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  let q = supabase
    .from("study_schedule")
    .select(
      "id, due_date, status, miss_count, completed_at, path_id, lesson_id"
    )
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
      q = q.gte("due_date", start).lt("due_date", end);
    }
  }

  const { data: rows, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const snapshot = await buildEnrichedScheduleSnapshot(supabase, rows ?? [], {
    studentId: user.id,
  });
  if (snapshot.error) {
    return NextResponse.json({ error: snapshot.error }, { status: 500 });
  }

  return NextResponse.json(snapshot.data);
}
