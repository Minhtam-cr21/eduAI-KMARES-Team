import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacherOrAdmin("/teacher");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/teacher"
            className="text-sm font-semibold text-foreground hover:opacity-80"
          >
            EduAI · Giáo viên
          </Link>
          <nav className="flex flex-wrap gap-1 sm:gap-4">
            <Link
              href="/teacher"
              className="text-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            >
              Tổng quan
            </Link>
            <Link
              href="/teacher/courses"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            >
              Khóa học
            </Link>
            <Link
              href="/teacher/connections"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            >
              Kết nối
            </Link>
            <Link
              href="/teacher/students"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            >
              Học sinh
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            >
              Lộ trình (học sinh)
            </Link>
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
