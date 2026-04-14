import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** GET — thống kê học tập của user đăng nhập (study_schedule + practice_submissions). */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count: completed, error: e1 } = await supabase
    .from("study_schedule")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const { count: totalAssigned, error: e2 } = await supabase
    .from("study_schedule")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (e1 || e2) {
    return NextResponse.json(
      { error: e1?.message ?? e2?.message },
      { status: 500 }
    );
  }

  const sevenDaysLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    sevenDaysLabels.push(utcYmd(d));
  }
  const startIso = `${sevenDaysLabels[0]}T00:00:00.000Z`;

  const { data: weekRows, error: e3 } = await supabase
    .from("study_schedule")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .gte("completed_at", startIso);

  if (e3) {
    return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  const counts: Record<string, number> = Object.fromEntries(
    sevenDaysLabels.map((d) => [d, 0])
  );
  for (const row of weekRows ?? []) {
    const ca = row.completed_at as string | null;
    if (!ca) continue;
    const key = utcYmd(new Date(ca));
    if (key in counts) {
      counts[key] += 1;
    }
  }

  const weekly_progress = sevenDaysLabels.map((date) => ({
    date,
    count: counts[date] ?? 0,
  }));

  const { data: subs, error: e4 } = await supabase
    .from("practice_submissions")
    .select("lesson_id, exercise_id")
    .eq("user_id", user.id);

  let lessonPractice = 0;
  let exercisePractice = 0;
  if (!e4 && subs) {
    for (const s of subs) {
      if (s.lesson_id) lessonPractice += 1;
      else if (s.exercise_id) exercisePractice += 1;
    }
  }

  const totalCompleted = completed ?? 0;
  const totalAll = totalAssigned ?? 0;
  const progress_percent =
    totalAll > 0 ? Math.round((100 * totalCompleted) / totalAll) : 0;

  return NextResponse.json({
    total_lessons_completed: totalCompleted,
    total_lessons_assigned: totalAll,
    total_time_spent_minutes: null as number | null,
    progress_percent,
    weekly_progress,
    practice_breakdown: [
      { name: "Thực hành theo bài khóa", value: lessonPractice },
      { name: "Bài luyện (exercise)", value: exercisePractice },
    ],
  });
}
