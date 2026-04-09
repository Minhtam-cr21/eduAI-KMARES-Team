"use client";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CourseWithTeacher } from "@/types/database";
import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Catalog = { data: CourseWithTeacher[]; count: number | null };

const CATEGORY_COLORS: Record<string, string> = {
  programming: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  web: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  data: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  mobile: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
};

function CourseSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border p-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function ExploreCoursesPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
      setCatalog({ data: catJson.data ?? [], count: catJson.count ?? null });

      if (enRes.ok) {
        const enJson = (await enRes.json()) as {
          courses?: Array<{ course: { id: string } }>;
        };
        setEnrolledIds(
          new Set((enJson.courses ?? []).map((x) => x.course.id))
        );
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
      const j = (await res.json()) as {
        error?: string;
        syncWarning?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không đăng ký được");
        return;
      }
      toast.success(
        j.syncWarning
          ? "Đăng ký thành công"
          : "Đăng ký thành công — lộ trình đã đồng bộ.",
        j.syncWarning ? { description: j.syncWarning } : undefined
      );
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    } finally {
      setEnrolling(null);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (catalog?.data ?? []).forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [catalog]);

  const visible = useMemo(() => {
    let list = (catalog?.data ?? []).filter((c) => !enrolledIds.has(c.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      list = list.filter((c) => c.category === activeCategory);
    }
    return list;
  }, [catalog, enrolledIds, search, activeCategory]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Khám phá khóa học</h1>
            <p className="text-sm text-muted-foreground">
              Đăng ký để học — tiến độ bài học được đồng bộ tự động.
            </p>
          </div>
        </div>
        <Link
          href="/student/courses"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          ← Khóa của tôi
        </Link>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm khóa học theo tên hoặc mô tả..."
            className="pl-9"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                !activeCategory
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
                  activeCategory === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <CourseSkeleton />
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {(catalog?.data?.length ?? 0) === 0
                ? "Chưa có khóa học công khai."
                : search || activeCategory
                  ? "Không tìm thấy khóa học phù hợp."
                  : "Bạn đã đăng ký tất cả khóa trong danh sách."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => {
            const catColor =
              CATEGORY_COLORS[c.category?.toLowerCase() ?? ""] ??
              "bg-muted text-muted-foreground";
            return (
              <Card
                key={c.id}
                className="flex flex-col transition hover:shadow-md"
              >
                <div
                  className={cn(
                    "flex h-28 items-center justify-center rounded-t-xl",
                    catColor
                  )}
                >
                  <BookOpen className="h-10 w-10 opacity-40" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {c.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {c.description || "Không có mô tả."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {c.category && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.category}
                      </Badge>
                    )}
                    {c.course_type && (
                      <Badge variant="secondary" className="text-[10px]">
                        {c.course_type}
                      </Badge>
                    )}
                  </div>
                  {c.teacher?.full_name && (
                    <p className="text-xs text-muted-foreground">
                      GV: {c.teacher.full_name}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={enrolling === c.id}
                    onClick={() => void enroll(c.id)}
                    className={cn(
                      "w-full rounded-lg px-4 py-2 text-sm font-semibold transition",
                      "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    )}
                  >
                    {enrolling === c.id ? "Đang xử lý…" : "Đăng ký"}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
