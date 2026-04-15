"use client";

import {
  StudentCourseCard,
  type StudentCatalogCourse,
} from "@/components/student/course-card";
import { CourseFilterBar } from "@/components/student/course-filter";
import { CourseGrid } from "@/components/student/course-grid";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CategoryRow = { id: string; name: string; slug: string };

type CatalogResponse = {
  data: StudentCatalogCourse[];
  count: number | null;
  error?: string;
};

const PAGE_SIZE = 12;

function CourseSkeleton() {
  return (
    <CourseGrid>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-video w-full animate-pulse bg-muted" />
          <CardContent className="space-y-2 p-4">
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </CourseGrid>
  );
}

export default function ExploreCoursesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [courses, setCourses] = useState<StudentCatalogCourse[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [categorySlug, setCategorySlug] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [highlightCourseId, setHighlightCourseId] = useState<string | null>(
    null,
  );
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollmentFilter, setEnrollmentFilter] = useState<
    "all" | "enrolled" | "not_enrolled"
  >("all");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("courseId");
    setHighlightCourseId(id);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      300,
    );
    return () => window.clearTimeout(t);
  }, [searchInput]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/courses/enrolled");
        if (!res.ok) return;
        const j = (await res.json()) as {
          courses?: Array<{ course: { id: string } }>;
        };
        if (cancelled) return;
        setEnrolledIds(new Set((j.courses ?? []).map((c) => c.course.id)));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const catQ =
        categorySlug && categorySlug !== "all"
          ? `&categorySlug=${encodeURIComponent(categorySlug)}`
          : "";
      const searchQ = debouncedSearch
        ? `&q=${encodeURIComponent(debouncedSearch)}`
        : "";
      const enrollQ =
        enrollmentFilter !== "all" ? `&enrollment=${enrollmentFilter}` : "";
      const res = await fetch(
        `/api/courses?page=${page}&limit=${PAGE_SIZE}${catQ}${searchQ}${enrollQ}`,
      );
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
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }, [categorySlug, debouncedSearch, page, enrollmentFilter]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    setPage(1);
  }, [categorySlug, debouncedSearch, enrollmentFilter]);

  useEffect(() => {
    if (!highlightCourseId || loading) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`course-card-${highlightCourseId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [highlightCourseId, loading, courses]);

  const totalPages = useMemo(() => {
    const c = count ?? 0;
    return Math.max(1, Math.ceil(c / PAGE_SIZE));
  }, [count]);

  const refreshEnrolled = useCallback(async () => {
    try {
      const res = await fetch("/api/user/courses/enrolled");
      if (!res.ok) return;
      const j = (await res.json()) as {
        courses?: Array<{ course: { id: string } }>;
      };
      setEnrolledIds(new Set((j.courses ?? []).map((x) => x.course.id)));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Khám phá khóa học
            </h1>
            <p className="text-sm text-muted-foreground">
              Lọc theo danh mục — đăng ký hoặc tiếp tục học.
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

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 space-y-4 rounded-xl border border-border bg-card p-4 lg:w-64">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Danh mục
          </p>
          <CourseFilterBar
            categories={categories}
            categoriesLoading={catLoading}
            categorySlug={categorySlug}
            onCategoryChange={setCategorySlug}
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Tìm theo tên khóa học…"
          />
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ghi danh
            </p>
            <div className="flex flex-col gap-1 text-sm">
              {(
                [
                  ["all", "Tất cả"],
                  ["enrolled", "Đã đăng ký"],
                  ["not_enrolled", "Chưa đăng ký"],
                ] as const
              ).map(([val, lab]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEnrollmentFilter(val)}
                  className={`rounded-lg px-3 py-2 text-left transition ${
                    enrollmentFilter === val
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <CourseSkeleton />
          ) : courses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Không có khóa học phù hợp. Thử bộ lọc hoặc từ khóa khác.
                </p>
              </CardContent>
            </Card>
          ) : (
            <CourseGrid>
              {courses.map((c) => (
                <StudentCourseCard
                  key={c.id}
                  course={c}
                  enrolled={enrolledIds.has(c.id)}
                  highlight={highlightCourseId === c.id}
                  onEnrollSuccess={refreshEnrolled}
                />
              ))}
            </CourseGrid>
          )}

          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

          {count != null && !loading ? (
            <p className="text-muted-foreground mt-4 text-center text-xs">
              {count} khóa học trong catalog
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
