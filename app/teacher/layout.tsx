import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Khu vực `/teacher/*`: middleware + layout kiểm tra role teacher hoặc admin.
 * (Dùng `app/teacher/` thay vì route group `(teacher)` để URL đúng `/teacher/...`,
 * tránh trùng `/dashboard` của học sinh.)
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacherOrAdmin("/teacher/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="text-sm font-semibold text-foreground hover:opacity-80"
          >
            EduAI
          </Link>
          <nav className="flex flex-wrap gap-1 sm:gap-4">
            <Link
              href="/teacher/dashboard"
              className="text-foreground rounded-md px-2 py-1 text-sm font-medium"
            >
              Lớp học
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
