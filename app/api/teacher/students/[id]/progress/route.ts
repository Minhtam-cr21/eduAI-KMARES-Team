import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const studentId = params.id;

  const { data: profile, error: profileErr } = await gate.supabase
    .from("profiles")
    .select("id, role, full_name, goal, hours_per_day")
    .eq("id", studentId)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Không tìm thấy học sinh." }, { status: 404 });
  }

  const { data: paths, error: pathsErr } = await gate.supabase
    .from("learning_paths")
    .select(
      `
      id,
      status,
      due_date,
      completed_at,
      lessons (
        id,
        title,
        topics ( name )
      )
    `
    )
    .eq("student_id", studentId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (pathsErr) {
    return NextResponse.json({ error: pathsErr.message }, { status: 500 });
  }

  const rawList = paths ?? [];
  const list = rawList.map((row) => {
    const r = row as {
      id: string;
      status: string;
      due_date: string | null;
      completed_at: string | null;
      lessons:
        | {
            id: string;
            title: string;
            topics: { name: string } | { name: string }[] | null;
          }
        | Array<{
            id: string;
            title: string;
            topics: { name: string } | { name: string }[] | null;
          }>
        | null;
    };
    const L = r.lessons;
    const lesson = Array.isArray(L) ? L[0] : L;
    let topic: { name: string } | null = null;
    if (lesson?.topics) {
      const t = lesson.topics;
      const name = Array.isArray(t) ? t[0]?.name : t.name;
      if (name) topic = { name };
    }
    return {
      id: r.id,
      status: r.status,
      due_date: r.due_date,
      completed_at: r.completed_at,
      lesson: lesson
        ? { id: lesson.id, title: lesson.title, topic }
        : null,
    };
  });

  const total = list.length;
  const completed = list.filter((p) => p.status === "completed").length;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const { data: submissions, error: subErr } = await gate.supabase
    .from("code_submissions")
    .select("id, language, output, error, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  return NextResponse.json({
    student: profile,
    progressPercent,
    totalPaths: total,
    completedPaths: completed,
    learningPaths: list,
    recentSubmissions: submissions ?? [],
  });
}
