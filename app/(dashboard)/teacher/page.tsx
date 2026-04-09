import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadTeacherDashboardStats } from "@/lib/teacher/dashboard-stats";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function TeacherHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const stats = await loadTeacherDashboardStats(supabase, user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bảng điều khiển giáo viên
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tổng quan khóa học, học sinh và yêu cầu kết nối.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Khóa học</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.total_courses}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/teacher/courses"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Quản lý khóa học →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Học sinh (theo dõi)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.total_students}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/teacher/students"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Danh sách học sinh →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Yêu cầu chưa xử lý</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.pending_connections}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/teacher/connections"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Xem yêu cầu →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Khóa học gần đây</CardTitle>
            <CardDescription>5 khóa mới nhất</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent_courses.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có khóa học.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recent_courses.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {c.status} · {c.lesson_count} bài
                      </p>
                    </div>
                    <Link
                      href={`/teacher/courses/${c.id}/lessons`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "shrink-0"
                      )}
                    >
                      Bài học
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/teacher/courses"
              className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
            >
              Tất cả khóa học
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Yêu cầu kết nối (chờ)</CardTitle>
            <CardDescription>Tối đa 5 yêu cầu pending gần nhất</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent_pending_requests.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có yêu cầu chờ.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recent_pending_requests.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-border pb-2 last:border-0"
                  >
                    <p className="text-sm font-medium">
                      {r.student?.full_name ?? r.student_id}
                    </p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {r.goal}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/teacher/connections"
              className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
            >
              Quản lý kết nối
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
