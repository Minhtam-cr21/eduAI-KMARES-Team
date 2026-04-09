import { TeacherLessonsManager } from "@/components/teacher/teacher-lessons-manager";
import { BackButton } from "@/components/ui/back-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
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
    .select("id, title, status, teacher_id")
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <BackButton fallbackHref="/teacher/courses" label="Danh sách khóa học" className="mb-6" />
      <TeacherLessonsManager
        courseId={course.id}
        courseTitle={course.title}
        courseStatus={course.status}
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
