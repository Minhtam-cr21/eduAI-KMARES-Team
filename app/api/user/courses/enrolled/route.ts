import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — danh sách khóa học đã đăng ký + tiến độ. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "student") {
    return NextResponse.json(
      { error: "Chỉ học sinh mới xem được danh sách này." },
      { status: 403 }
    );
  }

  const { data: rows, error } = await supabase
    .from("user_courses")
    .select("id, course_id, status, enrolled_at, completed_at")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  const courseIds = list.map((r) => r.course_id as string);
  const { data: coursesData, error: cErr } = await supabase
    .from("courses")
    .select(
      "id, title, description, thumbnail_url, image_url, course_type, category, category_id, teacher_id, status, price, original_price, duration_hours, total_lessons, rating, reviews_count, level"
    )
    .in("id", courseIds);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const courseMap = new Map(
    (coursesData ?? []).map((c) => [c.id as string, c])
  );

  const teacherIds = Array.from(
    new Set(
      (coursesData ?? [])
        .map((c) => c.teacher_id as string | null)
        .filter((x): x is string => !!x)
    )
  );

  const teacherMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (teacherIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", teacherIds);
    for (const p of profs ?? []) {
      teacherMap.set(p.id as string, {
        full_name: (p.full_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  const { data: lessonRows } = await supabase
    .from("course_lessons")
    .select("course_id")
    .eq("status", "published")
    .in("course_id", courseIds);

  const publishedByCourse = new Map<string, number>();
  for (const lr of lessonRows ?? []) {
    const cid = lr.course_id as string;
    publishedByCourse.set(cid, (publishedByCourse.get(cid) ?? 0) + 1);
  }

  const { data: progRows } = await supabase
    .from("user_course_progress")
    .select("course_id")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .in("course_id", courseIds);

  const completedByCourse = new Map<string, number>();
  for (const pr of progRows ?? []) {
    const cid = pr.course_id as string;
    completedByCourse.set(cid, (completedByCourse.get(cid) ?? 0) + 1);
  }

  const courses = list.map((uc) => {
    const cid = uc.course_id as string;
    const course = courseMap.get(cid);
    const tid = course?.teacher_id as string | null | undefined;
    const teacher = tid ? teacherMap.get(tid) ?? null : null;
    return {
      enrollment: {
        id: uc.id,
        status: uc.status,
        enrolled_at: uc.enrolled_at,
        completed_at: uc.completed_at,
      },
      course: course ?? { id: cid },
      teacher,
      completed_lessons: completedByCourse.get(cid) ?? 0,
      total_lessons: publishedByCourse.get(cid) ?? 0,
    };
  });

  return NextResponse.json({ courses });
}
