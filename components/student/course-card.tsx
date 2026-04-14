"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/student/star-rating";

export type StudentCatalogCourse = {
  id: string;
  title: string;
  description: string | null;
  price?: number | null;
  original_price?: number | null;
  duration_hours?: number | null;
  total_lessons?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  course_type?: string;
  teacher?: { full_name?: string | null } | null;
  category?: { name?: string | null } | null;
};

function formatVnd(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "Miễn phí";
  if (Number(n) <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function coverUrl(c: StudentCatalogCourse) {
  return c.image_url?.trim() || c.thumbnail_url?.trim() || null;
}

export function StudentCourseCard({
  course,
  enrolled,
  highlight,
  onEnrollSuccess,
}: {
  course: StudentCatalogCourse;
  enrolled: boolean;
  highlight?: boolean;
  onEnrollSuccess?: () => void;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const img = coverUrl(course);
  const price = course.price != null ? Number(course.price) : 0;
  const orig =
    course.original_price != null ? Number(course.original_price) : null;
  const showSale =
    orig != null && !Number.isNaN(orig) && orig > price && price >= 0;
  const pct =
    showSale && orig
      ? Math.max(1, Math.round((1 - price / orig) * 100))
      : null;

  const descriptionSnippet =
    course.description?.trim() ||
    "Khám phá nội dung khóa học — xem chi tiết để biết thêm.";

  async function enroll(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEnrolling(true);
    try {
      const res = await fetch("/api/user/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 409) {
          toast.success("Bạn đã đăng ký khóa này");
          onEnrollSuccess?.();
          return;
        }
        toast.error(j.error ?? "Không đăng ký được");
        return;
      }
      toast.success("Đăng ký thành công");
      onEnrollSuccess?.();
    } finally {
      setEnrolling(false);
    }
  }

  const cta = enrolled ? (
    <Link
      href={`/student/courses/${course.id}`}
      className={cn(buttonVariants(), "w-full")}
      onClick={(e) => e.stopPropagation()}
    >
      Tiếp tục học
    </Link>
  ) : (
    <div className="flex w-full gap-2">
      <Link
        href={`/student/courses/${course.id}`}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "flex-1"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        Chi tiết
      </Link>
      <Button
        type="button"
        className="flex-1"
        disabled={enrolling}
        onClick={(e) => void enroll(e)}
      >
        {enrolling ? "…" : "Đăng ký"}
      </Button>
    </div>
  );

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Card
          id={`course-card-${course.id}`}
          className={cn(
            "group flex flex-col overflow-hidden transition hover:shadow-md",
            highlight &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        >
          <Link href={`/student/courses/${course.id}`} className="block min-h-0 flex-1">
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
              {pct != null ? (
                <span className="absolute right-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow">
                  -{pct}%
                </span>
              ) : null}
            </div>
            <CardContent className="space-y-2 p-4">
              <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug">
                {course.title}
              </h3>
              {course.teacher?.full_name ? (
                <p className="text-muted-foreground text-xs">
                  {course.teacher.full_name}
                </p>
              ) : null}
              <StarRating
                value={Number(course.rating) || 0}
                reviewCount={course.reviews_count ?? 0}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {course.duration_hours != null
                    ? `${course.duration_hours} giờ`
                    : "—"}
                </span>
                <span>{course.total_lessons ?? 0} bài</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-primary text-lg font-bold">
                  {formatVnd(price)}
                </span>
                {showSale ? (
                  <span className="text-muted-foreground text-sm line-through">
                    {formatVnd(orig)}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Link>
          <CardContent className="border-t border-border p-4 pt-0">{cta}</CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border-border bg-popover p-3 text-left text-popover-foreground"
      >
        <p className="line-clamp-4 text-xs">{descriptionSnippet}</p>
        <p className="text-muted-foreground mt-2 text-[11px]">
          {course.total_lessons ?? 0} bài ·
          {course.duration_hours != null
            ? ` ${course.duration_hours} giờ`
            : " Thời lượng —"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
