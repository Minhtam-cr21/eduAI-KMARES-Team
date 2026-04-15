"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StarRating } from "@/components/student/star-rating";
import { cn } from "@/lib/utils";
import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";

export type EnrolledCourseRow = {
  enrollment: { status: string };
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url?: string | null;
    image_url?: string | null;
    price?: number | null;
    duration_hours?: number | null;
    total_lessons?: number | null;
    rating?: number | null;
    reviews_count?: number | null;
  };
  teacher?: { full_name?: string | null } | null;
  completed_lessons?: number;
  total_lessons?: number;
};

function formatVnd(n: number | null | undefined) {
  const free = "Mi\u1EC5n ph\u00ED";
  if (n == null || Number.isNaN(Number(n))) return free;
  if (Number(n) <= 0) return free;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function coverUrl(c: EnrolledCourseRow["course"]) {
  return c.image_url?.trim() || c.thumbnail_url?.trim() || null;
}

const MOCK_RATING = 4.7;

export function EnrolledCourseCard({
  row,
  enrolled = true,
}: {
  row: EnrolledCourseRow;
  enrolled?: boolean;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const c = row.course;
  const img = coverUrl(c);
  const price = c.price != null ? Number(c.price) : 0;
  const teacherName = row.teacher?.full_name?.trim() || "Giáo viên EduAI";
  const rating = Number(c.rating) > 0 ? Number(c.rating) : MOCK_RATING;
  const reviewsCount = c.reviews_count ?? 0;
  const hours = c.duration_hours ?? null;
  const lessons = row.total_lessons ?? c.total_lessons ?? 0;
  const snippet =
    c.description?.trim() ||
    "Khóa học trên EduAI — xem chi tiết để biết thêm nội dung và lộ trình.";

  async function enroll(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEnrolling(true);
    try {
      const res = await fetch("/api/user/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: c.id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 409) {
          toast.success("Bạn đã đăng ký khóa này");
          return;
        }
        toast.error(j.error ?? "Không đăng ký được");
        return;
      }
      toast.success("Đăng ký thành công");
    } finally {
      setEnrolling(false);
    }
  }

  const statusLabel =
    row.enrollment.status === "completed"
      ? "Đã xong"
      : row.enrollment.status === "active"
        ? "Đang học"
        : row.enrollment.status;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Card className="group flex h-full flex-col overflow-hidden transition hover:shadow-md">
          <div className="relative aspect-video w-full bg-muted">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt=""
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow">
              {statusLabel}
            </span>
          </div>
          <CardContent className="flex flex-1 flex-col space-y-2 p-4">
            <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug">
              {c.title}
            </h3>
            <p className="text-muted-foreground text-xs">{teacherName}</p>
            <StarRating value={rating} reviewCount={reviewsCount} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {hours != null ? `${hours} gi\u1EDD` : "\u2014"}
              </span>
              <span>{lessons} bài</span>
            </div>
            <p className="text-primary text-lg font-bold">{formatVnd(price)}</p>
            <div className="mt-auto flex gap-2 pt-2">
              <Link
                href={`/student/courses/${c.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
              >
                Chi tiết
              </Link>
              {enrolled ? (
                <Link
                  href={`/student/courses/${c.id}`}
                  className={cn(buttonVariants(), "flex-1")}
                >
                  Học tiếp
                </Link>
              ) : (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={enrolling}
                  onClick={(e) => void enroll(e)}
                >
                  {enrolling ? "…" : "Đăng ký"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left">
        <p className="line-clamp-4 text-xs">{snippet}</p>
      </TooltipContent>
    </Tooltip>
  );
}
