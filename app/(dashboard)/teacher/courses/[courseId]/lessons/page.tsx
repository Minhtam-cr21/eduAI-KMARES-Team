import { TeacherLessonsManager } from "@/components/teacher/teacher-lessons-manager";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function TeacherCourseLessonsPage({
  params,
}: {
  params: { courseId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, title, status, teacher_id, is_published")
    .eq("id", params.courseId)
    .maybeSingle();

  if (cErr || !course) {
    notFound();
  }
  if (course.teacher_id !== user.id) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("course_id", params.courseId)
    .order("order_index", { ascending: true });

  return (
    <div className="space-y-6">
      <TeacherLessonsManager
        courseId={course.id}
        courseTitle={course.title}
        courseIsPublished={course.is_published !== false}
        initialLessons={
          (lessons ?? []) as {
            id: string;
            course_id: string | null;
            title: string;
            content: string | null;
            video_url: string | null;
            code_template: string | null;
            order_index: number | null;
            status: string | null;
            created_at: string;
          }[]
        }
      />
    </div>
  );
}
