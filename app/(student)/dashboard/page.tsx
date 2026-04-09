"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type LearningPathItem = {
  id: string;
  due_date: string | null;
  status: string;
  lesson: {
    id: string;
    title: string;
    topic: { name: string };
  };
};

function isOnboardingComplete(p: {
  goal: string | null;
  hours_per_day: number | null;
}): boolean {
  const g = p.goal?.trim();
  const h = p.hours_per_day;
  return (
    Boolean(g) &&
    typeof h === "number" &&
    Number.isFinite(h) &&
    h >= 1 &&
    h <= 8
  );
}

function todayLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupPaths(items: LearningPathItem[]) {
  const map = new Map<string, LearningPathItem[]>();
  const noDate: LearningPathItem[] = [];
  for (const p of items) {
    if (!p.due_date) {
      noDate.push(p);
      continue;
    }
    if (!map.has(p.due_date)) map.set(p.due_date, []);
    map.get(p.due_date)!.push(p);
  }
  const keys = Array.from(map.keys()).sort();
  return {
    sections: keys.map((date) => ({ date, items: map.get(date)! })),
    noDate,
  };
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [paths, setPaths] = useState<LearningPathItem[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(true);

  const loadPaths = useCallback(async () => {
    setLoadingPaths(true);
    try {
      const res = await fetch("/api/user/learning-paths");
      const data = await res.json();
      if (!res.ok) {
        console.log("[student-dashboard] learning-paths error", res.status, data);
        toast.error("Không tải được lộ trình", {
          description: typeof data.error === "string" ? data.error : res.statusText,
        });
        setPaths([]);
        return;
      }
      const list = Array.isArray(data) ? (data as LearningPathItem[]) : [];
      console.log("[student-dashboard] learning-paths ok, count", list.length, list);
      setPaths(list);
    } catch (e) {
      console.log("[student-dashboard] learning-paths fetch failed", e);
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
      setPaths([]);
    } finally {
      setLoadingPaths(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = (await res.json()) as {
          profile?: { goal: string | null; hours_per_day: number | null };
        };
        if (!res.ok || !data.profile) {
          if (!cancelled) setReady(true);
          return;
        }
        if (!isOnboardingComplete(data.profile)) {
          router.replace("/onboarding");
          return;
        }
      } catch {
        /* bỏ qua */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadPaths();
  }, [ready, loadPaths]);

  const today = todayLocalStr();
  const { sections, noDate } = useMemo(() => groupPaths(paths), [paths]);

  const progress = useMemo(() => {
    const total = paths.length;
    const done = paths.filter((p) => p.status === "completed").length;
    return { done, total };
  }, [paths]);

  async function markComplete(pathId: string) {
    try {
      const res = await fetch(`/api/user/learning-paths/${pathId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Không cập nhật được", {
          description: data.error ?? res.statusText,
        });
        return;
      }
      toast.success("Đã đánh dấu hoàn thành.");
      await loadPaths();
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-muted-foreground text-center text-sm">Đang tải…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Lộ trình học tập
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {userId ? (
              <>
                Tiến độ:{" "}
                <span className="text-foreground font-medium">
                  {progress.done}/{progress.total}
                </span>{" "}
                bài hoàn thành
              </>
            ) : (
              "Đang xác thực phiên…"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/practice"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Phòng luyện code
          </Link>
          <Link
            href="/debug"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Debugger
          </Link>
        </div>
      </div>

      {loadingPaths ? (
        <p className="text-muted-foreground text-sm">Đang tải lộ trình…</p>
      ) : paths.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có lộ trình</CardTitle>
            <CardDescription>
              Hoàn tất onboarding hoặc chờ admin thêm bài học đã xuất bản.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          {sections.map(({ date, items }) => (
            <section key={date}>
              <h2 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
                {date}
                {date < today ? (
                  <span className="text-destructive ml-2 font-normal normal-case">
                    (có bài quá hạn)
                  </span>
                ) : null}
              </h2>
              <ul className="space-y-3">
                {items.map((p) => (
                  <PathRow
                    key={p.id}
                    path={p}
                    today={today}
                    onComplete={() => void markComplete(p.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {noDate.length > 0 ? (
            <section>
              <h2 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
                Không gắn hạn
              </h2>
              <ul className="space-y-3">
                {noDate.map((p) => (
                  <PathRow
                    key={p.id}
                    path={p}
                    today={today}
                    onComplete={() => void markComplete(p.id)}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}

function PathRow({
  path,
  today,
  onComplete,
}: {
  path: LearningPathItem;
  today: string;
  onComplete: () => void;
}) {
  const overdue =
    path.due_date != null &&
    path.due_date < today &&
    path.status !== "completed";
  const completed = path.status === "completed";

  return (
    <li>
      <Card
        className={
          overdue ? "border-destructive/40 bg-destructive/5" : undefined
        }
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {path.lesson.topic.name}
            </p>
            <p className="truncate font-medium">{path.lesson.title}</p>
            {overdue ? (
              <p className="text-destructive mt-1 text-xs">Quá hạn</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={completed}
                disabled={completed}
                onCheckedChange={(v) => {
                  if (v === true && !completed) onComplete();
                }}
              />
              <span>Hoàn thành</span>
            </label>
            <Link
              href={`/learn/${path.lesson.id}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Học
            </Link>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
