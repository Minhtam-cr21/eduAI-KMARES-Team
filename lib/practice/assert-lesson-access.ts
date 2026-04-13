import type { SupabaseClient } from "@supabase/supabase-js";

export type LessonForPractice = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  code_template: string | null;
  status: string;
};

/**
 * Học sinh chỉ xem/chạy bài lesson khi đã đăng ký khóa và bài đã published.
 */
export async function getPublishedLessonIfEnrolled(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<LessonForPractice | null> {
  const { data: lesson, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, course_id, title, content, code_template, status")
    .eq("id", lessonId)
    .eq("status", "published")
    .maybeSingle();

  if (lErr || !lesson) return null;

  const { data: enr, error: eErr } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", lesson.course_id as string)
    .maybeSingle();

  if (eErr || !enr) return null;

  return lesson as LessonForPractice;
}
