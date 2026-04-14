import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const baseNav = [
  { href: "/student", label: "Dashboard" },
  { href: "/quizzes", label: "Quiz" },
  { href: "/assessment", label: "Assessment" },
  { href: "/profile", label: "Profile" },
  { href: "/student/teachers", label: "Kết nối GV" },
  { href: "/personalized-roadmap", label: "Lộ trình" },
] as const;

export async function StudentNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showTeacher = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    showTeacher =
      profile?.role === "teacher" || profile?.role === "admin";
  }

  return (
    <nav className="flex flex-wrap gap-1 sm:gap-4">
      {baseNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
        >
          {item.label}
        </Link>
      ))}
      {showTeacher ? (
        <Link
          href="/teacher"
          className="text-primary rounded-md px-2 py-1 text-sm font-medium"
        >
          Giáo viên
        </Link>
      ) : null}
    </nav>
  );
}
