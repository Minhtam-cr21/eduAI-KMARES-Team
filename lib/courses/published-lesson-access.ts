import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishedLessonForEnrollment = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  code_template: string | null;
  solution_code: string | null;
  status: string;
};

/**
 * Student can access a lesson when enrolled in the course and the lesson is published.
 */
export async function getPublishedLessonIfEnrolled(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<PublishedLessonForEnrollment | null> {
  const { data: lesson, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, course_id, title, content, code_template, solution_code, status")
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

  return lesson as PublishedLessonForEnrollment;
}
