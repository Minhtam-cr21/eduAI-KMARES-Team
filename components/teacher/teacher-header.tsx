"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bell, Menu, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { TeacherNavLinks, type TeacherNavItem } from "./teacher-nav-links";

const TITLE_MAP: { prefix: string; title: string }[] = [
  { prefix: "/teacher/courses/", title: "Bài học khóa" },
  { prefix: "/teacher/courses", title: "Khóa học" },
  { prefix: "/teacher/roadmaps", title: "Roadmap công khai" },
  { prefix: "/teacher/lessons", title: "Bài học" },
  { prefix: "/teacher/connections", title: "Kết nối" },
  { prefix: "/teacher/students", title: "Học sinh" },
  { prefix: "/teacher/personalized-paths", title: "Lộ trình cá nhân" },
  { prefix: "/teacher/ai-roadmaps", title: "Lộ trình AI" },
  { prefix: "/teacher/notifications", title: "Thông báo" },
];

function headerTitle(pathname: string): string {
  if (pathname === "/teacher") return "Tổng quan";
  for (const { prefix, title } of TITLE_MAP) {
    if (pathname.startsWith(prefix)) return title;
  }
  return "Giáo viên";
}

export function TeacherHeader({
  mobileOpen,
  setMobileOpen,
  navItems,
  unreadNotifications,
}: {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  navItems: TeacherNavItem[];
  unreadNotifications: number;
}) {
  const pathname = usePathname();
  const title = headerTitle(pathname);

  return (
    <>
      <motion.header
        initial={false}
        className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Mở menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Image
            src="/images/logo.png"
            alt=""
            width={28}
            height={28}
            className="hidden h-7 w-7 rounded-md md:block"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="text-muted-foreground hidden text-xs sm:block">
              Quản lý lớp & lộ trình
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/teacher/notifications"
            aria-label="Thông báo"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "relative"
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 ? (
              <span className="bg-destructive text-destructive-foreground absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
          <ThemeToggle />
          <Link
            href="/profile"
            aria-label="Hồ sơ"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </motion.header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(100%,280px)] p-0">
          <SheetHeader className="border-b border-border/60 p-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Image src="/images/logo.png" alt="" width={28} height={28} className="rounded-md" />
              Menu giáo viên
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <TeacherNavLinks
              items={navItems}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
