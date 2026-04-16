"use client";

import {
  useTeacherPrimaryNavItems,
  useTeacherSecondaryNavItems,
  TeacherSidebarDesktop,
  useTeacherSidebarCollapsed,
} from "./teacher-sidebar";
import { TeacherHeader } from "./teacher-header";
import { useCallback, useEffect, useState } from "react";

const PATH_REVIEW_STATUSES = new Set([
  "draft",
  "pending",
  "pending_student_approval",
  "revision_requested",
]);

export function TeacherLayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useTeacherSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pathReviewPending, setPathReviewPending] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const [nRes, aRes, pRes] = await Promise.all([
        fetch("/api/notifications/teacher"),
        fetch("/api/teacher/custom-roadmaps?status=pending"),
        fetch("/api/personalized-path/teacher"),
      ]);
      if (nRes.ok) {
        const n = (await nRes.json()) as {
          notifications?: { is_read: boolean }[];
        };
        const list = n.notifications ?? [];
        setUnreadNotifications(list.filter((x) => !x.is_read).length);
      }
      let aiPending = 0;
      if (aRes.ok) {
        const a = (await aRes.json()) as { roadmaps?: unknown[] };
        aiPending = (a.roadmaps ?? []).length;
      }
      let pathWorkflow = 0;
      if (pRes.ok) {
        const p = (await pRes.json()) as {
          paths?: { status?: string }[];
        };
        pathWorkflow = (p.paths ?? []).filter((row) =>
          PATH_REVIEW_STATUSES.has((row.status ?? "") as string)
        ).length;
      }
      setPathReviewPending(aiPending + pathWorkflow);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshBadges();
    const id = setInterval(() => void refreshBadges(), 120_000);
    return () => clearInterval(id);
  }, [refreshBadges]);

  const primaryNav = useTeacherPrimaryNavItems({
    pathReview: pathReviewPending,
  });
  const secondaryNav = useTeacherSecondaryNavItems();
  const allNavItems = [...primaryNav, ...secondaryNav];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <TeacherSidebarDesktop
        collapsed={collapsed}
        onToggleCollapse={toggle}
        navItems={primaryNav}
        secondaryItems={secondaryNav}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TeacherHeader
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          navItems={allNavItems}
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
