"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PracticeExercise } from "@/types/database";
import Link from "next/link";
import { useEffect, useState } from "react";

type ListResponse = {
  data: PracticeExercise[];
  count: number;
  page: number;
  limit: number;
};

export default function StudentPracticeListPage() {
  const [res, setRes] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/practice/exercises?page=1&limit=50");
        const j = (await r.json()) as ListResponse & { error?: string };
        if (!r.ok) {
          if (!cancelled) setError(j.error ?? r.statusText);
          return;
        }
        if (!cancelled) setRes(j);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Lỗi mạng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Bài tập luyện code
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Chọn bài để mở editor, chạy code và lưu lịch sử.
          </p>
        </div>
        <Link
          href="/student"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Hub học sinh
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : !res?.data?.length ? (
        <p className="text-muted-foreground text-sm">
          Chưa có bài tập. Admin có thể thêm vào bảng{" "}
          <code className="text-xs">practice_exercises</code>.
        </p>
      ) : (
        <ul className="space-y-3">
          {res.data.map((ex) => (
            <li
              key={ex.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{ex.title}</p>
                <p className="text-muted-foreground text-xs">
                  {[ex.language, ex.difficulty].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link
                href={`/practice/${ex.id}`}
                className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
              >
                Làm bài
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
