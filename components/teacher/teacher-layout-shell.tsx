"use client";

import { useTeacherNavItems, TeacherSidebarDesktop, useTeacherSidebarCollapsed } from "./teacher-sidebar";
import { TeacherHeader } from "./teacher-header";
import { useCallback, useEffect, useState } from "react";

export function TeacherLayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useTeacherSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingAiCount, setPendingAiCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const [nRes, aRes] = await Promise.all([
        fetch("/api/notifications/teacher"),
        fetch("/api/teacher/custom-roadmaps?status=pending"),
      ]);
      if (nRes.ok) {
        const n = (await nRes.json()) as {
          notifications?: { is_read: boolean }[];
        };
        const list = n.notifications ?? [];
        setUnreadNotifications(list.filter((x) => !x.is_read).length);
      }
      if (aRes.ok) {
        const a = (await aRes.json()) as { roadmaps?: unknown[] };
        setPendingAiCount((a.roadmaps ?? []).length);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshBadges();
    const id = setInterval(() => void refreshBadges(), 120_000);
    return () => clearInterval(id);
  }, [refreshBadges]);

  const navItems = useTeacherNavItems({
    notifications: unreadNotifications,
    aiRoadmaps: pendingAiCount,
  });

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <TeacherSidebarDesktop
        collapsed={collapsed}
        onToggleCollapse={toggle}
        navItems={navItems}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TeacherHeader
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          navItems={navItems}
          unreadNotifications={unreadNotifications}
        />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
