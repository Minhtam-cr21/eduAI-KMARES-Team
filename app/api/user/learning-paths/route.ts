import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/learning-paths — lộ trình của user, sắp xếp theo due_date.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[learning-paths] GET: no user");
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { data: paths, error: pathsErr } = await supabase
    .from("learning_paths")
    .select("id, lesson_id, due_date, status")
    .eq("student_id", user.id)
    .order("due_date", { ascending: true });

  if (pathsErr) {
    console.log("[learning-paths] learning_paths error:", pathsErr.message);
    return NextResponse.json({ error: pathsErr.message }, { status: 500 });
  }

  const rows = paths ?? [];
  console.log(
    "[learning-paths] user",
    user.id,
    "learning_paths count",
    rows.length
  );
  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const lessonIds = Array.from(new Set(rows.map((r) => r.lesson_id)));

  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .select("id, title, topic_id")
    .in("id", lessonIds);

  if (lessonsErr) {
    console.log("[learning-paths] lessons error:", lessonsErr.message);
    return NextResponse.json({ error: lessonsErr.message }, { status: 500 });
  }

  const lessonList = lessons ?? [];
  const topicIds = Array.from(
    new Set(lessonList.map((l) => l.topic_id).filter(Boolean) as string[])
  );

  const { data: topics, error: topicsErr } = await supabase
    .from("topics")
    .select("id, title")
    .in("id", topicIds as string[]);

  if (topicsErr) {
    console.log("[learning-paths] topics error:", topicsErr.message);
    return NextResponse.json({ error: topicsErr.message }, { status: 500 });
  }

  const topicTitle = new Map((topics ?? []).map((t) => [t.id, t.title]));

  const lessonMap = new Map(
    lessonList.map((l) => [
      l.id,
      {
        id: l.id,
        title: l.title,
        topic: { name: topicTitle.get(l.topic_id) ?? "" },
      },
    ])
  );

  const out = rows.map((r) => {
    const lesson = lessonMap.get(r.lesson_id);
    if (!lesson) {
      return {
        id: r.id,
        due_date: r.due_date,
        status: r.status,
        lesson: {
          id: r.lesson_id,
          title: "(Bài học không tìm thấy)",
          topic: { name: "" },
        },
      };
    }
    return {
      id: r.id,
      due_date: r.due_date,
      status: r.status,
      lesson,
    };
  });

  console.log("[learning-paths] response items", out.length);
  return NextResponse.json(out);
}
