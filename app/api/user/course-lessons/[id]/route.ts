import { getPublishedLessonIfEnrolled } from "@/lib/courses/published-lesson-access";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — chi tiết bài học (published) nếu học sinh đã đăng ký khóa. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await getPublishedLessonIfEnrolled(
    supabase,
    user.id,
    params.id
  );

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", lesson.course_id)
    .maybeSingle();

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      course_id: lesson.course_id,
      title: lesson.title,
      content: lesson.content,
      code_template: lesson.code_template,
      status: lesson.status,
    },
    course: course ?? { id: lesson.course_id, title: null },
  });
}
