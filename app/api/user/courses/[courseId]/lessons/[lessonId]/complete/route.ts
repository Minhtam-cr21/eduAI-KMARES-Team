import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST — đánh dấu hoàn thành bài học trong khóa. */
export async function POST(
  _request: NextRequest,
  { params }: { params: { courseId: string; lessonId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId, lessonId } = params;

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

  const { data: lesson } = await supabase
    .from("course_lessons")
    .select("id, course_id, status")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson || lesson.course_id !== courseId || lesson.status !== "published") {
    return NextResponse.json({ error: "Bài học không hợp lệ." }, { status: 404 });
  }

  const { data: prog, error: progErr } = await supabase
    .from("user_course_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (progErr) {
    return NextResponse.json({ error: progErr.message }, { status: 500 });
  }
  if (!prog) {
    return NextResponse.json(
      {
        error:
          "Chưa có bản ghi tiến độ. Nhờ quản trị viên đồng bộ lộ trình cho khóa này.",
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("user_course_progress")
    .update({ status: "completed", completed_at: now })
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { count: totalPublished, error: tErr } = await supabase
    .from("course_lessons")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("status", "published");

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const { count: completedCount, error: cErr } = await supabase
    .from("user_course_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "completed");

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const total = totalPublished ?? 0;
  const done = completedCount ?? 0;
  if (total > 0 && done >= total) {
    await supabase
      .from("user_courses")
      .update({
        status: "completed",
        completed_at: now,
      })
      .eq("user_id", user.id)
      .eq("course_id", courseId);
  }

  return NextResponse.json({
    success: true,
    course_completed: total > 0 && done >= total,
  });
}
