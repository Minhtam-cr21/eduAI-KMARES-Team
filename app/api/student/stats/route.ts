import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type RecentActivityItem = {
  kind: "quiz" | "lesson";
  title: string;
  at: string;
};

/** GET — learning stats: study_schedule + quiz_attempts + dashboard summary. */
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
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const { count: totalAssigned, error: e2 } = await supabase
    .from("study_schedule")
    .select("id", { count: "exact", head: true })
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

  const { data: weekQuizRows, error: e3b } = await supabase
    .from("quiz_attempts")
    .select("completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .gte("completed_at", startIso);

  if (e3b) {
    return NextResponse.json({ error: e3b.message }, { status: 500 });
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
  for (const row of weekQuizRows ?? []) {
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

  const { count: quizzesCompleted, error: e4 } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("completed_at", "is", null);

  if (e4) {
    return NextResponse.json({ error: e4.message }, { status: 500 });
  }

  const qc = quizzesCompleted ?? 0;

  const totalCompleted = completed ?? 0;
  const totalAll = totalAssigned ?? 0;
  const progress_percent =
    totalAll > 0 ? Math.round((100 * totalCompleted) / totalAll) : 0;

  const { count: enrolledCoursesCount, error: e5 } = await supabase
    .from("user_courses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "dropped");

  if (e5) {
    return NextResponse.json({ error: e5.message }, { status: 500 });
  }

  const { data: recentQuiz, error: e6 } = await supabase
    .from("quiz_attempts")
    .select("completed_at, quizzes(title)")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(12);

  if (e6) {
    return NextResponse.json({ error: e6.message }, { status: 500 });
  }

  const { data: recentLessons, error: e7 } = await supabase
    .from("study_schedule")
    .select("completed_at, course_lessons(title)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(12);

  if (e7) {
    return NextResponse.json({ error: e7.message }, { status: 500 });
  }

  const merged: RecentActivityItem[] = [];
  for (const r of recentQuiz ?? []) {
    const q = r as {
      completed_at: string;
      quizzes: { title: string } | { title: string }[] | null;
    };
    const quizTitle = Array.isArray(q.quizzes)
      ? q.quizzes[0]?.title
      : q.quizzes?.title;
    merged.push({
      kind: "quiz",
      title: quizTitle ?? "Quiz",
      at: q.completed_at,
    });
  }
  for (const r of recentLessons ?? []) {
    const row = r as {
      completed_at: string;
      course_lessons: { title: string } | { title: string }[] | null;
    };
    const lessonTitle = Array.isArray(row.course_lessons)
      ? row.course_lessons[0]?.title
      : row.course_lessons?.title;
    merged.push({
      kind: "lesson",
      title: lessonTitle ?? "Bài học",
      at: row.completed_at,
    });
  }

  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recent_activity = merged.slice(0, 10);

  const exercises_completed = qc + totalCompleted;

  return NextResponse.json({
    total_lessons_completed: totalCompleted,
    total_lessons_assigned: totalAll,
    total_time_spent_minutes: null as number | null,
    progress_percent,
    weekly_progress,
    quiz_breakdown: [{ name: "Bài quiz đã hoàn thành", value: qc }],
    enrolled_courses_count: enrolledCoursesCount ?? 0,
    exercises_completed,
    certificates_count: 0,
    rank: 0,
    recent_activity,
  });
}
