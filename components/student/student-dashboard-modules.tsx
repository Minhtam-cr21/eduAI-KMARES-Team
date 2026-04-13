"use client";

import { RequireTestDialog } from "@/components/assessment/require-test-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Briefcase, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function StudentDashboardModules() {
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

  if (completed === null) {
    return (
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  const cardClass =
    "flex w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:shadow-md";

  return (
    <>
      <RequireTestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Lộ trình & định hướng
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {completed ? (
            <Link href="/personalized-roadmap" className={cardClass}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Lộ trình cá nhân hóa
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Xem lộ trình do giáo viên xây dựng theo kết quả test.
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
                <p className="font-semibold text-foreground">
                  Lộ trình cá nhân hóa
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cần hoàn thành trắc nghiệm định hướng để mở khóa.
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
                <p className="font-semibold text-foreground">
                  Định hướng nghề nghiệp
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Xem MBTI, trụ cột và gợi ý nghề — kết quả chi tiết.
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
                <p className="font-semibold text-foreground">
                  Định hướng nghề nghiệp
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Làm bài test để nhận phân tích và gợi ý nghề nghiệp.
                </p>
              </div>
            </button>
          )}
        </div>
      </section>
    </>
  );
}
