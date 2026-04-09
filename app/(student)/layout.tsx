import { StudentNav } from "@/components/student/student-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="text-sm font-semibold text-foreground hover:opacity-80"
          >
            EduAI
          </Link>
          <div className="flex items-center gap-2">
            <StudentNav />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
