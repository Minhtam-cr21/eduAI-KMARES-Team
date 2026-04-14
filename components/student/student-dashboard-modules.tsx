"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase, ClipboardList, Route } from "lucide-react";
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
      <div className="mb-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
        <h2 className="mb-4 text-lg font-semibold text-foreground">Learning</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/quizzes" className={cardClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Quizzes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Multiple-choice quizzes by course and lesson (module in progress).
              </p>
            </div>
          </Link>
          <Link href="/student#student-learning-stats" className={cardClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Learning stats</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Schedule progress, weekly chart, and quiz results.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Roadmap & career
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completed ? (
            <Link href="/personalized-roadmap" className={cardClass}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Personalized roadmap
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  View the path your teacher built from your assessment.
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
                  Personalized roadmap
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete the orientation quiz to unlock this section.
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
                <p className="font-semibold text-foreground">Career orientation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MBTI, pillars, and career suggestions — full results.
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
                <p className="font-semibold text-foreground">Career orientation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Take the assessment for analysis and career ideas.
                </p>
              </div>
            </button>
          )}
        </div>
      </section>
    </>
  );
}
