import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — tiến độ bài học trong một khóa (đã đăng ký). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = params.courseId;

  const { data: enroll } = await supabase
    .from("user_courses")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enroll || enroll.status === "dropped") {
    return NextResponse.json(
      { error: "Bạn chưa đăng ký khóa học này." },
      { status: 403 }
    );
  }

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, title, description, thumbnail_url, course_type, category, teacher_id")
    .eq("id", courseId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let teacher = null as {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  if (course.teacher_id) {
    const { data: t } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", course.teacher_id)
      .maybeSingle();
    if (t) {
      teacher = {
        full_name: (t.full_name as string | null) ?? null,
        avatar_url: (t.avatar_url as string | null) ?? null,
      };
    }
  }

  const { data: lessons, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, title, order_index, status, video_url")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("order_index", { ascending: true });

  if (lErr) {
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  const lessonList = lessons ?? [];
  const lessonIds = lessonList.map((l) => l.id as string);

  const progressMap = new Map<
    string,
    { status: string; completed_at: string | null }
  >();
  if (lessonIds.length > 0) {
    const { data: prog } = await supabase
      .from("user_course_progress")
      .select("lesson_id, status, completed_at")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .in("lesson_id", lessonIds);

    for (const p of prog ?? []) {
      progressMap.set(p.lesson_id as string, {
        status: p.status as string,
        completed_at: (p.completed_at as string | null) ?? null,
      });
    }
  }

  const lessonsWithProgress = lessonList.map((l) => {
    const id = l.id as string;
    const pr = progressMap.get(id);
    return {
      id,
      title: l.title,
      order_index: l.order_index,
      video_url: l.video_url,
      progress_status: pr?.status ?? null,
      completed_at: pr?.completed_at ?? null,
    };
  });

  return NextResponse.json({
    enrollment: enroll,
    course,
    teacher,
    lessons: lessonsWithProgress,
  });
}
