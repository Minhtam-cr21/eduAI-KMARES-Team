import { TeacherCoursesManager } from "@/components/teacher/teacher-courses-manager";
import { loadTeacherCoursesWithCounts } from "@/lib/teacher/courses-with-counts";
import { createClient } from "@/lib/supabase/server";

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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Khóa học của tôi
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Bảng này quản lý khóa học catalog hiện tại; luồng Edu V2 được tạo và
          chỉnh sửa ở trình builder riêng.
        </p>
      </div>
      <TeacherCoursesManager initialCourses={courses} />
    </div>
  );
}
