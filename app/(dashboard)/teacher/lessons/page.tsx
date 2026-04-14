import { TeacherLessonsDirectory } from "@/components/teacher/teacher-lessons-directory";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherLessonsIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const courseList = courses ?? [];
  const courseIds = courseList.map((c) => c.id as string);

  let lessonRows: {
    id: string;
    course_id: string;
    title: string;
    order_index: number | null;
    status: string | null;
    created_at: string;
  }[] = [];

  if (courseIds.length > 0) {
    const { data: lessons } = await supabase
      .from("course_lessons")
      .select("id, course_id, title, order_index, status, created_at")
      .in("course_id", courseIds)
      .order("course_id")
      .order("order_index", { ascending: true });
    lessonRows = (lessons ?? []) as typeof lessonRows;
  }

  const titleByCourseId = new Map(courseList.map((c) => [c.id as string, c.title as string]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tất cả bài học
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Danh sách bài học trên mọi khóa học của bạn — mở trang khóa để chỉnh sửa.
        </p>
      </div>
      <TeacherLessonsDirectory
        lessons={lessonRows.map((l) => ({
          ...l,
          course_title: titleByCourseId.get(l.course_id) ?? "—",
        }))}
      />
    </div>
  );
}
