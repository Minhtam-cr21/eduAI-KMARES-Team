"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StudentStatsPayload = {
  total_lessons_completed: number;
  total_lessons_assigned: number;
  total_time_spent_minutes: number | null;
  progress_percent: number;
  weekly_progress: { date: string; count: number }[];
  quiz_breakdown: { name: string; value: number }[];
  enrolled_courses_count?: number;
  exercises_completed?: number;
  certificates_count?: number;
  rank?: number;
  recent_activity?: { kind: string; title: string; at: string }[];
};

const BAR_FILL = "#6366f1";
const PIE_COLORS = ["#6366f1", "#0ea5e9", "#a855f7"];

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!d || !m) return iso;
  return `${d}/${m}`;
}

export function StudentStatsCharts({
  compact = false,
  stats: statsProp,
  statsLoading: statsLoadingProp,
  fetchEnabled = true,
}: {
  /** Chỉ hiển thị biểu đồ cột (dashboard 2 cột). */
  compact?: boolean;
  /** Cha đã gọi API — tránh fetch trùng. */
  stats?: StudentStatsPayload | null;
  statsLoading?: boolean;
  fetchEnabled?: boolean;
}) {
  const [internalStats, setInternalStats] = useState<StudentStatsPayload | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const controlled = !fetchEnabled;
  const stats = controlled ? statsProp ?? null : internalStats;
  const loading = controlled ? (statsLoadingProp ?? false) : internalLoading;

  const load = useCallback(async () => {
    setInternalLoading(true);
    try {
      const res = await fetch("/api/student/stats");
      const j = (await res.json()) as StudentStatsPayload & { error?: string };
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

  const barData = useMemo(() => {
    if (!stats?.weekly_progress) return [];
    return stats.weekly_progress.map((row) => ({
      label: formatDayLabel(row.date),
      count: row.count,
    }));
  }, [stats?.weekly_progress]);

  const pieData = useMemo(() => {
    const raw = stats?.quiz_breakdown ?? [];
    return raw.filter((x) => x.value > 0);
  }, [stats?.quiz_breakdown]);

  if (loading) {
    return (
      <Card className={compact ? "border-border/80" : "mb-8 border-border/80"}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className={compact ? "h-48 w-full" : "h-56 w-full"} />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const barBlock = (
    <div className="min-h-[240px] w-full min-w-0">
      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
        Hoạt động 7 ngày qua
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} width={32} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
            labelStyle={{ color: "#111" }}
          />
          <Bar
            dataKey="count"
            name="Hoàn thành"
            fill={BAR_FILL}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (compact) {
    return (
      <Card id="student-learning-stats" className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Biểu đồ hoàn thành</CardTitle>
          <p className="text-muted-foreground text-xs font-normal">
            Bài lịch + quiz theo ngày (UTC).
          </p>
        </CardHeader>
        <CardContent>{barBlock}</CardContent>
      </Card>
    );
  }

  return (
    <Card id="student-learning-stats" className="mb-8 border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Thống kê học tập</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">
          Hoàn thành{" "}
          <span className="font-medium text-foreground">
            {stats.total_lessons_completed}
          </span>
          /
          <span className="font-medium text-foreground">
            {stats.total_lessons_assigned}
          </span>{" "}
          bài trong lịch — tiến độ{" "}
          <span className="font-medium text-foreground">
            {stats.progress_percent}%
          </span>
          .
        </p>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {barBlock}

        <div className="min-h-[260px] w-full min-w-0">
          <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
            Quiz
          </p>
          {pieData.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Chưa có bài quiz hoàn thành.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
