"use client";

import type { CourseWithTeacher } from "@/types/database";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Catalog = {
  data: CourseWithTeacher[];
  count: number | null;
};

export default function ExploreCoursesPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, enRes] = await Promise.all([
        fetch("/api/courses?page=1&limit=50"),
        fetch("/api/user/courses/enrolled"),
      ]);
      const catJson = (await catRes.json()) as Catalog & { error?: string };
      if (!catRes.ok) {
        toast.error(catJson.error ?? "Không tải catalog");
        return;
      }
      setCatalog({
        data: catJson.data ?? [],
        count: catJson.count ?? null,
      });

      if (enRes.ok) {
        const enJson = (await enRes.json()) as {
          courses?: Array<{ course: { id: string } }>;
        };
        const ids = new Set(
          (enJson.courses ?? []).map((x) => x.course.id)
        );
        setEnrolledIds(ids);
      } else {
        setEnrolledIds(new Set());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await fetch("/api/user/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không đăng ký được");
        return;
      }
      toast.success("Đăng ký thành công");
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    } finally {
      setEnrolling(null);
    }
  }

  const visible =
    catalog?.data?.filter((c) => !enrolledIds.has(c.id)) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Khám phá khóa học</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Các khóa đã xuất bản — đăng ký để học (cần admin đồng bộ lộ trình sau
            khi đăng ký).
          </p>
        </div>
        <Link
          href="/student/courses"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Khóa của tôi
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {catalog?.data?.length === 0
            ? "Chưa có khóa học công khai."
            : "Bạn đã đăng ký tất cả khóa trong danh sách."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <li
              key={c.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-muted-foreground text-xs">
                  {c.category} · {c.course_type}
                  {c.teacher?.full_name ? ` · GV: ${c.teacher.full_name}` : null}
                </p>
                {c.description ? (
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                    {c.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={enrolling === c.id}
                onClick={() => void enroll(c.id)}
                className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
              >
                {enrolling === c.id ? "Đang xử lý…" : "Đăng ký"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
