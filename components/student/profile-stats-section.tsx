"use client";

import type { StudentStatsPayload } from "@/components/student/student-stats-charts";
import { StudentStatsCards } from "@/components/student/student-stats";
import { StudentStatsCharts } from "@/components/student/student-stats-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function ProfileStatsSection() {
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

  const recentList = stats?.recent_activity ?? [];

  return (
    <section className="mt-10 space-y-8 border-t border-border pt-10">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Thống kê học tập</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tổng quan khóa đăng ký, bài/quiz hoàn thành và tiến độ lịch học.
        </p>
      </div>

      <StudentStatsCards fetchEnabled={false} stats={stats} statsLoading={loading} />

      <StudentStatsCharts fetchEnabled={false} stats={stats} statsLoading={loading} />

      <Card className="border-border/80">
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            Hoạt động gần đây
          </h3>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : recentList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Hoàn thành bài trong lịch hoặc quiz để thấy hoạt động tại đây.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentList.map((item, i) => (
                <li
                  key={`${item.at}-${i}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 text-foreground">
                    <span className="text-xs text-muted-foreground">
                      {item.kind === "quiz" ? "Quiz" : "Bài học"}
                    </span>
                    <br />
                    <span className="line-clamp-2 font-medium">{item.title}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(item.at).toLocaleDateString("vi-VN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
