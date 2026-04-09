import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Stats = {
  total_users: number;
  total_teachers: number;
  total_students: number;
  total_courses_published: number;
  total_lessons_published: number;
  total_code_submissions: number;
  total_ai_calls: number;
  total_completed_lessons: number;
};

export default async function AdminHomePage() {
  const [statsRes, coursesRes, lessonsRes, reportsRes] = await Promise.all([
    fetchInternalApi("/api/admin/stats"),
    fetchInternalApi("/api/courses/pending"),
    fetchInternalApi("/api/course-lessons/pending"),
    fetchInternalApi("/api/reports/admin"),
  ]);

  let stats: Stats | null = null;
  if (statsRes.ok) {
    stats = (await statsRes.json()) as Stats;
  }

  type IdTitle = { id?: string; title?: string };
  type ReportPreview = { id?: string; description?: string; type?: string | null };

  const pendingCourses: IdTitle[] = coursesRes.ok
    ? ((await coursesRes.json()) as IdTitle[]).slice(0, 5)
    : [];
  const pendingLessons: IdTitle[] = lessonsRes.ok
    ? ((await lessonsRes.json()) as IdTitle[]).slice(0, 5)
    : [];
  const recentReports: ReportPreview[] = reportsRes.ok
    ? ((await reportsRes.json()) as ReportPreview[]).slice(0, 5)
    : [];

  const statCards = stats
    ? [
        { label: "Tổng người dùng", value: stats.total_users },
        { label: "Giáo viên", value: stats.total_teachers },
        { label: "Học sinh", value: stats.total_students },
        { label: "Khóa (đã xuất bản)", value: stats.total_courses_published },
        { label: "Bài học khóa (đã xuất bản)", value: stats.total_lessons_published },
        { label: "Bài nộp code", value: stats.total_code_submissions },
        { label: "Gọi AI", value: stats.total_ai_calls },
        { label: "Bài học hoàn thành (lộ trình)", value: stats.total_completed_lessons },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Thống kê hệ thống và việc cần xử lý.
        </p>
      </div>

      {!stats ? (
        <p className="text-destructive text-sm">Không tải được thống kê.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Khóa học chờ duyệt</CardTitle>
            <Link
              href="/admin/courses/pending"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pendingCourses.length === 0 ? (
              <p className="text-muted-foreground">Không có.</p>
            ) : (
              <ul className="space-y-2">
                {pendingCourses.map((c) => (
                  <li key={String(c.id)} className="line-clamp-1 border-b border-border pb-2 last:border-0">
                    {c.title ?? c.id}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Bài học chờ duyệt</CardTitle>
            <Link
              href="/admin/lessons/pending"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pendingLessons.length === 0 ? (
              <p className="text-muted-foreground">Không có.</p>
            ) : (
              <ul className="space-y-2">
                {pendingLessons.map((row) => (
                  <li
                    key={String(row.id)}
                    className="line-clamp-1 border-b border-border pb-2 last:border-0"
                  >
                    {row.title ?? row.id}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Báo cáo gần đây</CardTitle>
            <Link
              href="/admin/reports"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Quản lý
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentReports.length === 0 ? (
              <p className="text-muted-foreground">Không có.</p>
            ) : (
              <ul className="space-y-2">
                {recentReports.map((r) => (
                  <li
                    key={String(r.id)}
                    className="border-b border-border pb-2 last:border-0"
                  >
                    <span className="text-muted-foreground text-xs">
                      {r.type ?? "—"}
                    </span>
                    <p className="line-clamp-2">{r.description ?? ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
