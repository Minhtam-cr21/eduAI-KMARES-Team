import { getPublishedLessonIfEnrolled } from "@/lib/practice/assert-lesson-access";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET — lấy đáp án đã lưu (DB), không gọi AI.
 * ?exerciseId=uuid | ?lessonId=uuid
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get("exerciseId")?.trim();
  const lessonId = searchParams.get("lessonId")?.trim();

  if (!exerciseId && !lessonId) {
    return NextResponse.json(
      { error: "Cần exerciseId hoặc lessonId" },
      { status: 400 }
    );
  }
  if (exerciseId && lessonId) {
    return NextResponse.json(
      { error: "Chỉ gửi một trong exerciseId hoặc lessonId" },
      { status: 400 }
    );
  }

  if (exerciseId) {
    const { data, error } = await supabase
      .from("practice_exercises")
      .select("solution_code")
      .eq("id", exerciseId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const code = data.solution_code?.trim() || null;
    return NextResponse.json({
      solution: code,
      source: code ? ("database" as const) : null,
    });
  }

  const lesson = await getPublishedLessonIfEnrolled(supabase, user.id, lessonId!);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found or not enrolled" }, { status: 404 });
  }

  const code = lesson.solution_code?.trim() || null;
  return NextResponse.json({
    solution: code,
    source: code ? ("database" as const) : null,
  });
}
