"use client";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { BookOpen, Clock, Search, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CategoryRow = { id: string; name: string; slug: string; display_order?: number };

type CatalogCategory = { id: string; name: string; slug: string; icon?: string | null } | null;

type CatalogCourse = {
  id: string;
  title: string;
  description: string | null;
  price?: number | null;
  duration_hours?: number | null;
  total_lessons?: number | null;
  rating?: number | null;
  level?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  course_type?: string;
  teacher?: { full_name?: string | null } | null;
  category?: CatalogCategory;
};

type CatalogResponse = {
  data: CatalogCourse[];
  count: number | null;
  error?: string;
};

function formatVnd(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "Free";
  if (Number(n) <= 0) return "Free";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function Stars({ value }: { value: number }) {
  const r = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${value} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"
          )}
        />
      ))}
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border p-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function ExploreCoursesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [categorySlug, setCategorySlug] = useState("all");
  const [search, setSearch] = useState("");
  const [highlightCourseId, setHighlightCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("courseId");
    setHighlightCourseId(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatLoading(true);
      try {
        const res = await fetch("/api/course-categories");
        const j = (await res.json()) as { data?: CategoryRow[] };
        if (!cancelled && res.ok && j.data) setCategories(j.data);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        categorySlug && categorySlug !== "all"
          ? `&categorySlug=${encodeURIComponent(categorySlug)}`
          : "";
      const res = await fetch(`/api/courses?page=1&limit=50${q}`);
      const j = (await res.json()) as CatalogResponse;
      if (!res.ok) {
        toast.error(j.error ?? "Không tải catalog");
        setCourses([]);
        setCount(null);
        return;
      }
      setCourses(j.data ?? []);
      setCount(j.count ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const visible = useMemo(() => {
    let list = courses;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, search]);

  useEffect(() => {
    if (!highlightCourseId || loading) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`course-card-${highlightCourseId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [highlightCourseId, loading, visible]);

  const coverUrl = (c: CatalogCourse) =>
    c.image_url?.trim() || c.thumbnail_url?.trim() || null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Khám phá khóa học</h1>
            <p className="text-sm text-muted-foreground">
              Lọc theo danh mục — xem chi tiết và đăng ký học.
            </p>
          </div>
        </div>
        <Link
          href="/student/courses"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Khóa của tôi
        </Link>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
          {catLoading ? (
            <Skeleton className="h-9 w-40 shrink-0 rounded-full" />
          ) : (
            categories.map((cat) => {
              const active = categorySlug === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategorySlug(cat.slug)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {cat.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      {loading ? (
        <CourseSkeleton />
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {courses.length === 0
                ? "No courses match this filter."
                : "Không tìm thấy khóa học."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => {
            const img = coverUrl(c);
            const rating = Number(c.rating) || 0;
            return (
              <Card
                id={`course-card-${c.id}`}
                key={c.id}
                className={cn(
                  "flex flex-col overflow-hidden transition hover:shadow-md",
                  highlightCourseId === c.id &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <div className="relative aspect-video w-full bg-muted">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {c.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {c.description || "Không có mô tả."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Stars value={rating} />
                    <span className="tabular-nums">{rating.toFixed(1)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {c.duration_hours != null ? `${c.duration_hours} h` : "—"}
                    </span>
                    <span>{c.total_lessons ?? 0} bài</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.category?.name ? (
                      <Badge variant="outline" className="text-[10px]">
                        {c.category.name}
                      </Badge>
                    ) : null}
                    {c.course_type ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {c.course_type}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatVnd(c.price)}
                  </p>
                  {c.teacher?.full_name ? (
                    <p className="text-xs text-muted-foreground">
                      GV: {c.teacher.full_name}
                    </p>
                  ) : null}
                  <Link
                    href={`/student/courses/${c.id}`}
                    className={cn(buttonVariants(), "w-full")}
                  >
                    Xem chi tiết
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {count != null && !loading ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Showing {visible.length} of {count} courses
        </p>
      ) : null}
    </main>
  );
}
