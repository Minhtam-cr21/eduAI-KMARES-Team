"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseWithTeacher } from "@/types/database";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CoursesPayload = {
  data: CourseWithTeacher[];
  count: number | null;
};

export default function StudentCoursesPage() {
  const [payload, setPayload] = useState<CoursesPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses?page=1&limit=30");
        const j = (await res.json()) as CoursesPayload & { error?: string };
        if (!res.ok) {
          toast.error("Không tải được khóa học", {
            description: j.error ?? res.statusText,
          });
          return;
        }
        if (!cancelled) setPayload(j);
      } catch (e) {
        toast.error("Lỗi mạng", {
          description: e instanceof Error ? e.message : String(e),
        });
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
            Khóa học đã xuất bản
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nguồn: <code className="text-xs">GET /api/courses</code>
          </p>
        </div>
        <Link
          href="/student"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Hub
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : !payload?.data?.length ? (
        <p className="text-muted-foreground text-sm">Chưa có khóa học nào.</p>
      ) : (
        <ul className="space-y-3">
          {payload.data.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="font-medium">{c.title}</p>
              <p className="text-muted-foreground text-xs">
                {c.category} · {c.course_type}
                {c.teacher?.full_name
                  ? ` · GV: ${c.teacher.full_name}`
                  : null}
              </p>
              {c.description ? (
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                  {c.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
