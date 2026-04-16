import { EduV2CourseBuilder } from "@/components/teacher/edu-v2-course-builder";
import { BackButton } from "@/components/ui/back-button";
import Link from "next/link";

export default function TeacherEditEduV2CoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  const { courseId } = params;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton fallbackHref="/teacher/courses" />
        <Link
          href="/teacher/courses"
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          Danh sách khóa học
        </Link>
      </div>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Chỉnh sửa khóa học (Edu V2)
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">{courseId}</p>
      </div>
      <EduV2CourseBuilder courseId={courseId} />
    </div>
  );
}
