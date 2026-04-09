import { TeacherCoursesManager } from "@/components/teacher/teacher-courses-manager";
import { loadTeacherCoursesWithCounts } from "@/lib/teacher/courses-with-counts";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TeacherCoursesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const courses = await loadTeacherCoursesWithCounts(supabase, user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Khóa học của tôi</h1>
          <p className="text-muted-foreground text-sm">
            Tạo, sửa, xóa khóa học và mở trang bài học.
          </p>
        </div>
        <Link
          href="/teacher"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Tổng quan
        </Link>
      </div>
      <TeacherCoursesManager initialCourses={courses} />
    </div>
  );
}
