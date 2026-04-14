"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type TeacherNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export function TeacherNavLinks({
  items,
  collapsed,
  onNavigate,
  className,
}: {
  items: TeacherNavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/teacher" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 ? (
                  <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs tabular-nums">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
