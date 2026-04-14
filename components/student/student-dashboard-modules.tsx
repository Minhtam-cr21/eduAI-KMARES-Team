"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookOpen, Briefcase, Code2, Lightbulb, Route } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

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

type NextSuggest = {
  suggested_language: string;
  suggested_difficulty: string;
  reason: string;
  recent_attempts?: number;
  approx_success_rate?: number;
};

export function StudentDashboardModules() {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggest, setSuggest] = useState<NextSuggest | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/practice/next-suggestion");
        const j = (await res.json()) as NextSuggest & { error?: string };
        if (!cancelled) {
          if (res.ok) setSuggest(j);
          else setSuggest(null);
        }
      } catch {
        if (!cancelled) setSuggest(null);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (completed === null) {
    return (
      <div className="mb-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
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
          Phòng luyện code
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/practice/random" className={cardClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Random thông minh</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI hoặc ngân hàng bài — chọn ngôn ngữ & độ khó.
              </p>
            </div>
          </Link>
          <Link href="/practice/exercises" className={cardClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Theo khóa học</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bài có code trong các khóa bạn đã ghi danh.
              </p>
            </div>
          </Link>
          {suggestLoading ? (
            <Skeleton className="h-[7.25rem] rounded-xl" />
          ) : suggest ? (
            <div className={cn(cardClass, "flex-col items-stretch gap-2 sm:flex-row sm:items-start")}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Gợi ý hôm nay</p>
                <p className="mt-1 text-sm text-muted-foreground">{suggest.reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Gợi ý:{" "}
                  <span className="font-medium text-foreground">
                    {suggest.suggested_language} / {suggest.suggested_difficulty}
                  </span>
                  {typeof suggest.recent_attempts === "number" ? (
                    <>
                      {" "}
                      · {suggest.recent_attempts} lượt gần đây
                      {typeof suggest.approx_success_rate === "number"
                        ? ` · ~${Math.round(suggest.approx_success_rate * 100)}% không lỗi`
                        : ""}
                    </>
                  ) : null}
                </p>
                <Link
                  href="/practice/random"
                  className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Mở phòng luyện random →
                </Link>
              </div>
            </div>
          ) : (
            <div className={cn(cardClass, "items-center justify-center text-sm text-muted-foreground")}>
              Không tải được gợi ý.
            </div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Lộ trình & định hướng
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {completed ? <AiRoadmapRequestDialog /> : null}

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
