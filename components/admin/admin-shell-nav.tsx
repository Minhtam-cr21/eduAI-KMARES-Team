"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/courses/pending", label: "Duyệt khóa học" },
  { href: "/admin/lessons/pending", label: "Duyệt bài học" },
  { href: "/admin/reports", label: "Báo cáo" },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/topics", label: "Chủ đề" },
  { href: "/admin/practice-questions", label: "Practice" },
] as const;

export function AdminShellNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border bg-card px-4 py-2 sm:gap-3">
      {links.map((l) => {
        const active =
          pathname === l.href ||
          (l.href !== "/admin" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "text-foreground rounded-md px-2 py-1 text-sm font-medium"
                : "text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
