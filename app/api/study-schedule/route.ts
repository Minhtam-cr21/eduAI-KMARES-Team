import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET — lịch học của user (kèm lesson + course để dẫn link).
 * Query: year, month (1–12) optional — lọc theo tháng; không có thì trả về tất cả.
 */
export async function GET(request: Request) {
  const supabase = createClient();
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

  const list = rows ?? [];
  const lessonIds = Array.from(
    new Set(list.map((r) => r.lesson_id).filter(Boolean))
  ) as string[];

  const lessonById = new Map<
    string,
    { id: string; title: string; course_id: string }
  >();
  const courseById = new Map<string, { id: string; title: string }>();

  if (lessonIds.length > 0) {
    const { data: lessons } = await supabase
      .from("course_lessons")
      .select("id, title, course_id")
      .in("id", lessonIds);

    const courseIds = new Set<string>();
    for (const L of lessons ?? []) {
      const id = L.id as string;
      lessonById.set(id, {
        id,
        title: (L.title as string) ?? "",
        course_id: L.course_id as string,
      });
      if (L.course_id) courseIds.add(L.course_id as string);
    }

    if (courseIds.size > 0) {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", Array.from(courseIds));

      for (const c of courses ?? []) {
        courseById.set(c.id as string, {
          id: c.id as string,
          title: (c.title as string) ?? "",
        });
      }
    }
  }

  const items = list.map((r) => {
    const lesson = r.lesson_id ? lessonById.get(r.lesson_id) : undefined;
    const course = lesson?.course_id
      ? courseById.get(lesson.course_id)
      : undefined;
    return {
      ...r,
      lesson: lesson
        ? { ...lesson, course: course ?? null }
        : null,
    };
  });

  return NextResponse.json({ items });
}
