"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentStatsPayload } from "@/components/student/student-stats-charts";
import { Award, BookOpen, Medal, ListChecks, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type DashboardStats = StudentStatsPayload;

export function StudentStatsCards({
  className,
  stats: statsProp,
  statsLoading: statsLoadingProp,
  fetchEnabled = true,
}: {
  className?: string;
  stats?: DashboardStats | null;
  statsLoading?: boolean;
  fetchEnabled?: boolean;
}) {
  const [internalStats, setInternalStats] = useState<DashboardStats | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const controlled = !fetchEnabled;
  const stats = controlled ? statsProp ?? null : internalStats;
  const loading = controlled ? (statsLoadingProp ?? false) : internalLoading;

  const load = useCallback(async () => {
    setInternalLoading(true);
    try {
      const res = await fetch("/api/student/stats");
      const j = (await res.json()) as DashboardStats & { error?: string };
      if (!res.ok) {
        setInternalStats(null);
        return;
      }
      setInternalStats(j);
    } catch {
      setInternalStats(null);
    } finally {
      setInternalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (controlled) return;
    void load();
  }, [controlled, load]);

  if (loading) {
    return (
      <div className={className}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "Khóa đã đăng ký",
      value: stats.enrolled_courses_count ?? 0,
      icon: BookOpen,
      tone: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Bài / quiz hoàn thành",
      value: stats.exercises_completed ?? 0,
      icon: ListChecks,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Chứng chỉ",
      value: stats.certificates_count ?? 0,
      icon: Award,
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Thứ hạng",
      value: stats.rank ?? 0,
      icon: Medal,
      tone: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="border-border/80 shadow-sm transition hover:border-primary/20"
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.bg}`}
              >
                <c.icon className={`h-5 w-5 ${c.tone}`} />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium">{c.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {c.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {stats.progress_percent != null ? (
        <Card className="mt-3 border-border/80">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Tiến độ lịch học</p>
              <p className="text-muted-foreground text-xs">
                {stats.total_lessons_completed}/{stats.total_lessons_assigned} bài đã hoàn thành
                trong lộ trình — {stats.progress_percent}%
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
