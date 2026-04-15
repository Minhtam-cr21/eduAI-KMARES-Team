import { redirect } from "next/navigation";

/** @deprecated Use /teacher/courses/[courseId]/curriculum */
export default function TeacherCourseLessonsRedirectPage({
  params,
}: {
  params: { courseId: string };
}) {
  redirect(`/teacher/courses/${params.courseId}/curriculum`);
}
