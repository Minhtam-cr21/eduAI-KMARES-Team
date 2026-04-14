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
  practice_breakdown: { name: string; value: number }[];
};

const BAR_FILL = "#6366f1";
const PIE_COLORS = ["#6366f1", "#0ea5e9", "#a855f7"];

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!d || !m) return iso;
  return `${d}/${m}`;
}

export function StudentStatsCharts() {
  const [stats, setStats] = useState<StudentStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/stats");
      const j = (await res.json()) as StudentStatsPayload & { error?: string };
      if (!res.ok) {
        setStats(null);
        return;
      }
      setStats(j);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const barData = useMemo(() => {
    if (!stats?.weekly_progress) return [];
    return stats.weekly_progress.map((row) => ({
      label: formatDayLabel(row.date),
      count: row.count,
    }));
  }, [stats?.weekly_progress]);

  const pieData = useMemo(() => {
    const raw = stats?.practice_breakdown ?? [];
    return raw.filter((x) => x.value > 0);
  }, [stats?.practice_breakdown]);

  if (loading) {
    return (
      <Card className="mb-8 border-border/80">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className="mb-8 border-border/80 shadow-sm">
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
        <div className="min-h-[260px] w-full min-w-0">
          <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
            Bài hoàn thành 7 ngày qua
          </p>
          <ResponsiveContainer width="100%" height={240}>
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
                name="Bài hoàn thành"
                fill={BAR_FILL}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-h-[260px] w-full min-w-0">
          <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
            Phân bổ luyện tập
          </p>
          {pieData.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Chưa có dữ liệu luyện tập.
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
