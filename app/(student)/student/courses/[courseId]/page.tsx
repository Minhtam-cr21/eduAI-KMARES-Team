"use client";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = typeof params.courseId === "string" ? params.courseId : "";
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
        const j = (await res.json()) as ProgressPayload & { error?: string };
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
        j.course_completed ? "Hoàn thành khóa học!" : "Đã hoàn thành bài học"
      );
      const refresh = await fetch(`/api/user/courses/${courseId}/progress`);
      if (refresh.ok) {
        const next = (await refresh.json()) as ProgressPayload;
        setData(next);
      }
    } finally {
      setCompleting(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-4 h-40 w-full" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground text-sm">Không có dữ liệu.</p>
        <Link href="/student/courses" className="text-primary mt-4 inline-block text-sm">
          ← Quay lại
        </Link>
      </main>
    );
  }

  const { course, teacher, lessons } = data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="text-muted-foreground text-sm">
            {course.category} · {course.course_type}
            {teacher?.full_name ? ` · GV: ${teacher.full_name}` : null}
          </p>
          {course.description ? (
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
              {course.description}
            </p>
          ) : null}
        </div>
        <Link
          href="/student/courses"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Danh sách khóa
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-medium">Bài học</h2>
      <ul className="space-y-2">
        {lessons.length === 0 ? (
          <li className="text-muted-foreground text-sm">
            Chưa có bài học đã xuất bản hoặc chưa được đồng bộ lộ trình. Liên hệ
            quản trị viên nếu bạn đã đăng ký.
          </li>
        ) : (
          lessons.map((l) => {
            const done = l.progress_status === "completed";
            const canComplete =
              l.progress_status === "pending" && !done;
            return (
              <li
                key={l.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {l.order_index != null ? `${l.order_index}. ` : ""}
                    {l.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {done
                      ? `Đã hoàn thành${l.completed_at ? ` · ${new Date(l.completed_at).toLocaleString("vi-VN")}` : ""}`
                      : l.progress_status
                        ? "Chưa hoàn thành"
                        : "Chưa có tiến độ — cần đồng bộ lộ trình"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/student/courses/${courseId}/lessons/${l.id}`}
                    className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                  >
                    Học
                  </Link>
                  {canComplete ? (
                    <button
                      type="button"
                      disabled={completing === l.id}
                      onClick={() => void markComplete(l.id)}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      {completing === l.id ? "…" : "Hoàn thành"}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
