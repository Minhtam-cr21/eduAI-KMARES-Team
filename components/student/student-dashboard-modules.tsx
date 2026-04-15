"use client";

import type { StudentStatsPayload } from "@/components/student/student-stats-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase, ClipboardList, Route, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RequireTestDialog = dynamic(
  () =>
    import("@/components/assessment/require-test-dialog").then((m) => ({
      default: m.RequireTestDialog,
    })),
  { ssr: false }
);

const AiRoadmapRequestDialog = dynamic(
  () =>
    import("@/components/student/ai-roadmap-request-dialog").then((m) => ({
      default: m.AiRoadmapRequestDialog,
    })),
  { ssr: false }
);

function formatDayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!d || !m) return iso;
  return `${d}/${m}`;
}

const BAR_FILL = "#6366f1";

export function StudentDashboardModules({
  stats,
  statsLoading,
}: {
  stats: StudentStatsPayload | null;
  statsLoading: boolean;
}) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/assessment/status");
        if (!res.ok) {
          if (!cancelled) setCompleted(false);
          return;
        }
        const j = (await res.json()) as { completed?: boolean };
        if (!cancelled) setCompleted(j.completed === true);
      } catch {
        if (!cancelled) setCompleted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(
    () =>
      (stats?.weekly_progress ?? []).map((x) => ({
        ...x,
        label: formatDayLabel(x.date),
      })),
    [stats?.weekly_progress]
  );

  if (completed === null) {
    return (
      <div className="mb-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  const cardClass =
    "flex h-full min-h-[118px] w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:shadow-md";

  return (
    <>
      <RequireTestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Học tập</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Link href="/quizzes" className={cardClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Quiz</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bài trắc nghiệm theo khóa học và bài học.
              </p>
            </div>
          </Link>
          <div className={cn(cardClass, "cursor-default flex-col")}>
            <div className="mb-2 flex w-full items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Thống kê 7 ngày</p>
                <p className="text-sm text-muted-foreground">
                  Số bài hoàn thành (lịch học + quiz) theo ngày.
                </p>
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              <div className="h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8 }}
                      formatter={(v) => [`${v ?? 0}`, "Hoàn thành"]}
                    />
                    <Bar dataKey="count" fill={BAR_FILL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Lộ trình & nghề nghiệp</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completed ? (
            <Link href="/personalized-roadmap" className={cardClass}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Lộ trình cá nhân hóa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lộ trình giáo viên đã duyệt sau trắc nghiệm.
                </p>
              </div>
            </Link>
          ) : (
            <button
              type="button"
              className={cn(cardClass, "cursor-pointer")}
              onClick={() => setDialogOpen(true)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Lộ trình cá nhân hóa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hoàn thành trắc nghiệm định hướng để mở khóa.
                </p>
              </div>
            </button>
          )}

          {completed ? (
            <AiRoadmapRequestDialog
              renderTrigger={({ open }) => (
                <button type="button" className={cardClass} onClick={() => open()}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Yêu cầu AI tạo lộ trình</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nhập mục tiêu và khung thời gian — gửi giáo viên duyệt.
                    </p>
                  </div>
                </button>
              )}
            />
          ) : (
            <button
              type="button"
              className={cn(cardClass, "cursor-pointer")}
              onClick={() => setDialogOpen(true)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Yêu cầu AI tạo lộ trình</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    "L\u00E0m tr\u1EAFc nghi\u1EC7m tr\u01B0\u1EDBc \u0111\u1EC3 d\u00F9ng t\u00EDnh n\u0103ng n\u00E0y."
                  }
                </p>
              </div>
            </button>
          )}

          {completed ? (
            <Link href="/career" className={cardClass}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Định hướng nghề nghiệp</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MBTI, điểm mạnh/yếu và gợi ý nghề nghiệp.
                </p>
              </div>
            </Link>
          ) : (
            <button
              type="button"
              className={cn(cardClass, "cursor-pointer")}
              onClick={() => setDialogOpen(true)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Định hướng nghề nghiệp</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hoàn thành trắc nghiệm để xem phân tích.
                </p>
              </div>
            </button>
          )}
        </div>
      </section>
    </>
  );
}
