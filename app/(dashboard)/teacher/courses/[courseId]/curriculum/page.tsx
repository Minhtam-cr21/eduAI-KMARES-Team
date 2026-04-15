import { CurriculumEditor } from "@/components/teacher/curriculum-editor";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function TeacherCourseCurriculumPage({
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
    .select("id, title, teacher_id, is_published")
    .eq("id", params.courseId)
    .maybeSingle();

  if (cErr || !course) {
    notFound();
  }
  if (course.teacher_id !== user.id) {
    notFound();
  }

  return (
    <CurriculumEditor
      courseId={course.id}
      courseTitle={course.title}
      courseIsPublished={course.is_published !== false}
    />
  );
}
