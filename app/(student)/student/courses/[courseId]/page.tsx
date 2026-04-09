"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  RotateCcw,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProgressPayload = {
  enrollment: { id: string; status: string };
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    category: string;
    course_type: string;
  };
  teacher: { full_name: string | null; avatar_url: string | null } | null;
  lessons: Array<{
    id: string;
    title: string;
    order_index: number | null;
    video_url: string | null;
    progress_status: string | null;
    completed_at: string | null;
  }>;
};

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {value}/{max} bài đã hoàn thành
        </span>
        <span className="font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-6 h-8 w-3/4" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-8 h-3 w-full rounded-full" />
      <div className="mt-8 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId =
    typeof params.courseId === "string" ? params.courseId : "";
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/courses/${courseId}/progress`);
        const j = (await res.json()) as ProgressPayload & {
          error?: string;
        };
        if (!res.ok) {
          toast.error(j.error ?? "Không tải được khóa học");
          if (!cancelled) setData(null);
          return;
        }
        if (!cancelled) setData(j);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, completed: 0 };
    const total = data.lessons.length;
    const completed = data.lessons.filter(
      (l) => l.progress_status === "completed"
    ).length;
    return { total, completed };
  }, [data]);

  async function markComplete(lessonId: string) {
    setCompleting(lessonId);
    try {
      const res = await fetch(
        `/api/user/courses/${courseId}/lessons/${lessonId}/complete`,
        { method: "POST" }
      );
      const j = (await res.json()) as {
        error?: string;
        course_completed?: boolean;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      toast.success(
        j.course_completed
          ? "Hoàn thành khóa học!"
          : "Đã hoàn thành bài học"
      );
      const refresh = await fetch(
        `/api/user/courses/${courseId}/progress`
      );
      if (refresh.ok) {
        const next = (await refresh.json()) as ProgressPayload;
        setData(next);
      }
    } finally {
      setCompleting(null);
    }
  }

  if (loading) return <DetailSkeleton />;

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Không có dữ liệu.</p>
        <Link
          href="/student/courses"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </main>
    );
  }

  const { course, teacher, lessons } = data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton fallbackHref="/student/courses" label="Danh sách khóa học" className="mb-6" />

      {/* Course header */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {course.title}
        </h1>
        {course.description && (
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        )}

        {/* Meta badges */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1.5 py-1">
            <Layers className="h-3.5 w-3.5" />
            {course.category}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1">
            {course.course_type === "skill" ? "Skill" : "Role"}
          </Badge>
          {teacher?.full_name && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {teacher.full_name}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {stats.total} bài học
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />~{Math.max(1, Math.ceil(stats.total * 0.5))}h
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <ProgressBar value={stats.completed} max={stats.total} />
        </div>
      </section>

      {/* Lesson list */}
      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" />
          Nội dung bài học
        </h2>

        {lessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Chưa có bài học đã xuất bản hoặc chưa được đồng bộ lộ trình.
              Liên hệ quản trị viên nếu bạn đã đăng ký.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lessons.map((l, idx) => {
              const done = l.progress_status === "completed";
              const canComplete =
                l.progress_status === "pending" && !done;
              return (
                <li
                  key={l.id}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border p-4 transition",
                    done
                      ? "border-emerald-200/60 bg-emerald-50/30"
                      : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                  )}
                >
                  {/* Index circle */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      done
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span>{(l.order_index ?? idx) + 1}</span>
                    )}
                  </div>

                  {/* Title & meta */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-medium",
                        done
                          ? "text-emerald-700"
                          : "text-foreground"
                      )}
                    >
                      {l.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {done
                        ? `Hoàn thành${l.completed_at ? ` · ${new Date(l.completed_at).toLocaleDateString("vi-VN")}` : ""}`
                        : l.progress_status === "pending"
                          ? "Chưa hoàn thành"
                          : "Chờ đồng bộ lộ trình"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/student/courses/${courseId}/lessons/${l.id}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition",
                        done
                          ? "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {done ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ôn tập</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Học</span>
                        </>
                      )}
                    </Link>
                    {canComplete && (
                      <button
                        type="button"
                        disabled={completing === l.id}
                        onClick={() => void markComplete(l.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">
                          {completing === l.id ? "…" : "Hoàn thành"}
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
