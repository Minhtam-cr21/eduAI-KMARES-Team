"use client";

import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, Route, User } from "lucide-react";
import Link from "next/link";

const cardClass =
  "flex h-full min-h-[118px] w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:shadow-md";

const pillars = [
  {
    href: "/student/courses",
    title: "Khóa học",
    description: "Khóa đã đăng ký, khám phá thêm và học tiếp.",
    icon: BookOpen,
    iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/personalized-roadmap",
    title: "Lộ trình cá nhân hóa",
    description:
      "\u0110\u1ec1 xu\u1ea5t kh\u00f3a v\u00e0 l\u1ecbch t\u1eeb gi\u00e1o vi\u00ean (\u0111\u00e3 duy\u1ec7t ho\u1eb7c ch\u1edd).",
    icon: Route,
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    href: "/study-schedule",
    title: "Lịch học thông minh",
    description: "Priority, soft deadline và tải học tập theo tuần.",
    icon: CalendarDays,
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  {
    href: "/profile",
    title: "Profile",
    description:
      "Th\u00f4ng tin t\u00e0i kho\u1ea3n v\u00e0 t\u00f9y ch\u1ecdn h\u1ed3 s\u01a1.",
    icon: User,
    iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
] as const;

export function StudentDashboardModules() {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          4 pillar chính
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Các route legacy vẫn giữ cho deep-link, nhưng điều hướng chính chỉ còn 4 mục này.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.href} href={p.href} prefetch className={cn(cardClass)}>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  p.iconClass
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
