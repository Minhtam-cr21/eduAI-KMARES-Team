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
  /** Legacy catalog vs Edu V2 (`edu_courses`). */
  catalogBackend?: "legacy" | "edu_v2";
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

  const descriptionSnippet =
    course.description?.trim() ||
    "Khám phá nội dung khóa học — xem chi tiết để biết thêm.";

  async function enroll(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEnrolling(true);
    try {
      const isV2 = course.catalogBackend === "edu_v2";
      const res = await fetch(
        isV2
          ? `/api/v2/courses/${course.id}/enroll`
          : "/api/user/courses/enroll",
        {
          method: "POST",
          headers: isV2 ? undefined : { "Content-Type": "application/json" },
          body: isV2 ? undefined : JSON.stringify({ courseId: course.id }),
        }
      );
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
