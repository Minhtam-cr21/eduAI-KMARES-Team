"use client";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EnrolledPayload = {
  courses: Array<{
    enrollment: {
      id: string;
      status: string;
      enrolled_at: string;
      completed_at: string | null;
    };
    course: {
      id: string;
      title?: string;
      description?: string | null;
      thumbnail_url?: string | null;
      category?: string;
      course_type?: string;
    };
    teacher: { full_name: string | null; avatar_url: string | null } | null;
    completed_lessons: number;
    total_lessons: number;
  }>;
};

export default function MyCoursesPage() {
  const [data, setData] = useState<EnrolledPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/courses/enrolled");
        const j = (await res.json()) as EnrolledPayload & { error?: string };
        if (!res.ok) {
          toast.error(j.error ?? "Không tải được danh sách");
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
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Khóa học của tôi
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Các khóa bạn đã đăng ký và tiến độ bài học.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/courses/explore"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Khám phá khóa học
          </Link>
          <Link
            href="/student"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← Hub
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : !data?.courses?.length ? (
        <p className="text-muted-foreground text-sm">
          Bạn chưa đăng ký khóa nào.{" "}
          <Link href="/student/courses/explore" className="text-primary underline">
            Khám phá khóa học
          </Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {data.courses.map((item) => {
            const c = item.course;
            const t = item.total_lessons;
            const done = item.completed_lessons;
            return (
              <li
                key={item.enrollment.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-40">
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.title ?? "Khóa học"}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.category} · {c.course_type}
                    {item.teacher?.full_name
                      ? ` · GV: ${item.teacher.full_name}`
                      : null}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Tiến độ: {done}/{t} bài
                  </p>
                </div>
                <Link
                  href={`/student/courses/${c.id}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "shrink-0 self-start sm:self-center"
                  )}
                >
                  Tiếp tục
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
