"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  Link2,
  ListVideo,
  MapPinned,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  TeacherNavLinks,
  isTeacherNavItemActive,
  type TeacherNavItem,
} from "@/components/teacher/teacher-nav-links";

const STORAGE_KEY = "teacher-sidebar-collapsed";

export function useTeacherPrimaryNavItems(badges: {
  pathReview?: number;
}): TeacherNavItem[] {
  return [
    { href: "/teacher", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/teacher/courses", label: "Khóa học", icon: BookOpen },
    { href: "/teacher/students", label: "Học sinh", icon: Users },
    {
      href: "/teacher/path-review",
      label: "Duyệt lộ trình",
      icon: GitBranch,
      badge: badges.pathReview,
      activePrefixes: [
        "/teacher/path-review",
        "/teacher/personalized-paths",
        "/teacher/ai-roadmaps",
      ],
    },
    {
      href: "/teacher/schedule-insights",
      label: "Lịch học & can thiệp",
      icon: CalendarDays,
    },
    {
      href: "/teacher/notifications",
      label: "Thông báo",
      icon: Bell,
    },
  ];
}

export function useTeacherSecondaryNavItems(): TeacherNavItem[] {
  return [
    { href: "/teacher/roadmaps", label: "Roadmap công khai", icon: MapPinned },
    { href: "/teacher/lessons", label: "Bài học", icon: ListVideo },
    { href: "/teacher/connections", label: "Kết nối", icon: Link2 },
  ];
}

function CollapsedNavLinks({ items }: { items: TeacherNavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isTeacherNavItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function TeacherSidebarDesktop({
  collapsed,
  onToggleCollapse,
  navItems,
  secondaryItems,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  navItems: TeacherNavItem[];
  secondaryItems?: TeacherNavItem[];
}) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="relative hidden h-screen shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-md md:flex md:flex-col"
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-border/60 px-3",
          collapsed ? "justify-center" : "gap-2",
        )}
      >
        <Link
          href="/teacher"
          className={cn(
            "flex items-center gap-2 font-semibold text-foreground",
            collapsed && "justify-center",
          )}
        >
          <Image
            src="/images/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
          />
          {!collapsed ? (
            <span className="truncate text-sm">EduAI Teacher</span>
          ) : null}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {collapsed ? (
          <CollapsedNavLinks
            items={[...navItems, ...(secondaryItems ?? [])]}
          />
        ) : (
          <>
            <TeacherNavLinks items={navItems} />
            {secondaryItems?.length ? (
              <>
                <p className="text-muted-foreground px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide">
                  Thêm
                </p>
                <TeacherNavLinks items={secondaryItems} className="mt-0.5" />
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="border-t border-border/60 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full gap-2", collapsed && "px-0")}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}

export function useTeacherSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
