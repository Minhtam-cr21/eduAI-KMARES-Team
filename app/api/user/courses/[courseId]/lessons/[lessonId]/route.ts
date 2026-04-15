import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET — nội dung bài học (course_lessons) khi đã đăng ký khóa.
 * API mới, không sửa route course-lessons/[id] cũ.
 */
export async function GET(
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
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enroll) {
    return NextResponse.json(
      { error: "Bạn chưa đăng ký khóa học này." },
      { status: 403 }
    );
  }

  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .select(
      "id, course_id, title, content, video_url, code_template, order_index, status, type, time_estimate"
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!lesson || lesson.course_id !== courseId || lesson.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ lesson });
}
