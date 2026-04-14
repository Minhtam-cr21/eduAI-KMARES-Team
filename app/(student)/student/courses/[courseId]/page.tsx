"use client";

import { CourseDetailTabs } from "@/components/student/course-detail-tabs";
import { StarRating } from "@/components/student/star-rating";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookOpen, Clock, Play, User, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CourseDetailApi = {
  course: Record<string, unknown> & {
    teacher?: unknown;
    category?: unknown;
  };
  lessons: Array<{
    id: string;
    title: string;
    order_index: number | null;
    video_url: string | null;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user: { full_name: string | null; avatar_url: string | null } | null;
  }>;
  review_stats: {
    average: number;
    count: number;
    by_star: Record<number, number>;
  };
  my_review: { id: string } | null;
};

type ProgressPayload = {
  enrollment: { id: string; status: string };
  lessons: Array<{
    id: string;
    title: string;
    order_index: number | null;
    video_url: string | null;
    progress_status: string | null;
    completed_at: string | null;
  }>;
};

function youtubeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function formatVnd(n: unknown) {
  const num = Number(n);
  if (Number.isNaN(num) || num <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = typeof params.courseId === "string" ? params.courseId : "";

  const [detail, setDetail] = useState<CourseDetailApi | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);

  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [enrolling, setEnrolling] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!courseId) return;
    setLoadingDetail(true);
    setDetailErr(null);
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      const j = (await res.json()) as CourseDetailApi & { error?: string };
      if (!res.ok) {
        setDetail(null);
        setDetailErr(j.error ?? "Không tìm thấy");
        return;
      }
      setDetail(j);
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoadingDetail(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/user/courses/enrolled");
      if (!res.ok) {
        if (!cancelled) {
          setEnrolled(false);
          setEnrollmentStatus(null);
        }
        return;
      }
      const j = (await res.json()) as {
        courses?: Array<{ course: { id: string }; enrollment: { status: string } }>;
      };
      const row = (j.courses ?? []).find((x) => x.course.id === courseId);
      if (!cancelled) {
        setEnrolled(!!row);
        setEnrollmentStatus(row?.enrollment?.status ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !enrolled) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingProgress(true);
      try {
        const res = await fetch(`/api/user/courses/${courseId}/progress`);
        const j = (await res.json()) as ProgressPayload & { error?: string };
        if (!cancelled && res.ok) setProgress(j);
        else if (!cancelled) setProgress(null);
      } finally {
        if (!cancelled) setLoadingProgress(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, enrolled]);

  const course = detail?.course;
  const teacher = course?.teacher as
    | { full_name?: string | null; avatar_url?: string | null }
    | null
    | undefined;
  const category = course?.category as { name?: string; slug?: string } | null | undefined;

  const lessonProgress = useMemo(() => {
    const m = new Map<
      string,
      { progress_status: string | null; completed_at: string | null }
    >();
    for (const l of progress?.lessons ?? []) {
      m.set(l.id, {
        progress_status: l.progress_status,
        completed_at: l.completed_at,
      });
    }
    return m;
  }, [progress]);

  const firstLessonHref = useMemo(() => {
    const lessons = detail?.lessons ?? [];
    if (lessons.length === 0) return null;
    const withPr = lessons.map((l) => ({
      l,
      pr: lessonProgress.get(l.id),
    }));
    const next = withPr.find((x) => x.pr?.progress_status !== "completed");
    const pick = next?.l ?? lessons[0];
    return `/student/courses/${courseId}/lessons/${pick.id}`;
  }, [detail, lessonProgress, courseId]);

  async function enroll() {
    setEnrolling(true);
    try {
      const res = await fetch("/api/user/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 409) {
          setEnrolled(true);
          toast.success("Bạn đã đăng ký khóa này");
          return;
        }
        toast.error(j.error ?? "Không đăng ký được");
        return;
      }
      toast.success("Đăng ký thành công");
      setEnrolled(true);
    } finally {
      setEnrolling(false);
    }
  }

  async function submitReview() {
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không gửi được đánh giá");
        return;
      }
      toast.success("Cảm ơn bạn đã đánh giá");
      setReviewComment("");
      await loadDetail();
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loadingDetail) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-10 w-full" />
      </main>
    );
  }

  if (detailErr || !course || !detail) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-muted-foreground">{detailErr ?? "Không tìm thấy"}</p>
        <Link href="/student/courses/explore" className="mt-4 inline-block text-primary">
          ← Khám phá khóa học
        </Link>
      </main>
    );
  }

  const title = String(course.title ?? "");
  const description = (course.description as string | null) ?? null;
  const content = (course.content as string | null) ?? null;
  const imageUrl =
    (course.image_url as string | null) || (course.thumbnail_url as string | null);
  const promo = course.promo_video_url as string | null;
  const embed = youtubeEmbedUrl(promo);
  const price = course.price;
  const originalPrice = course.original_price as number | null | undefined;
  const priceNum = price != null ? Number(price) : 0;
  const origNum =
    originalPrice != null && !Number.isNaN(Number(originalPrice))
      ? Number(originalPrice)
      : null;
  const showSale = origNum != null && origNum > priceNum && priceNum >= 0;
  const pct =
    showSale && origNum ? Math.max(1, Math.round((1 - priceNum / origNum) * 100)) : null;

  const durationHours = course.duration_hours as number | null;
  const totalLessons = (course.total_lessons as number | null) ?? detail.lessons.length;
  const rating = Number(course.rating) || detail.review_stats.average || 0;
  const level = (course.level as string | null) ?? null;
  const enrolledCount = (course.enrolled_count as number | null) ?? 0;

  const objectives = course.objectives as string[] | null;
  const targetAudience = course.target_audience as string | null;
  const recommendations = course.recommendations as string | null;
  const wyl = course.what_you_will_learn as string[] | null;
  const requirements = course.requirements as string[] | null;
  const faq = course.faq;

  const canReview = enrolled && !detail.my_review;

  const ctaPrimary = enrolled ? (
    firstLessonHref ? (
      <Link
        href={firstLessonHref}
        className={cn(buttonVariants(), "inline-flex w-full items-center justify-center")}
      >
        <Play className="mr-2 h-4 w-4" />
        Học ngay
      </Link>
    ) : (
      <Button disabled className="w-full">
        <Play className="mr-2 h-4 w-4" />
        Học ngay
      </Button>
    )
  ) : (
    <Button className="w-full" onClick={() => void enroll()} disabled={enrolling}>
      {enrolling ? "…" : "Đăng ký ngay"}
    </Button>
  );

  const ctaHero = enrolled ? (
    firstLessonHref ? (
      <Link
        href={firstLessonHref}
        className={cn(buttonVariants({ size: "lg" }), "inline-flex items-center justify-center")}
      >
        <Play className="mr-2 h-4 w-4" />
        Học ngay
      </Link>
    ) : (
      <Button size="lg" disabled>
        <Play className="mr-2 h-4 w-4" />
        Học ngay
      </Button>
    )
  ) : (
    <Button size="lg" onClick={() => void enroll()} disabled={enrolling}>
      {enrolling ? "…" : "Đăng ký ngay"}
    </Button>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <BackButton fallbackHref="/student/courses/explore" label="Khám phá" className="mb-6" />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative aspect-video bg-muted lg:min-h-[320px]">
            {embed ? (
              <iframe
                title="Video giới thiệu"
                src={embed}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            {pct != null ? (
              <span className="absolute right-3 top-3 rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white shadow">
                -{pct}%
              </span>
            ) : null}
          </div>
          <div className="flex flex-col justify-center p-6 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              {category?.name ? <Badge variant="outline">{category.name}</Badge> : null}
              {level ? <Badge variant="secondary">{level}</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <StarRating
                value={rating}
                reviewCount={detail.review_stats.count}
                size="md"
              />
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 shrink-0" />
                {enrolledCount} học viên
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 shrink-0" />
                {durationHours != null ? `${durationHours} giờ` : "—"}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 shrink-0" />
                {totalLessons} bài
              </span>
            </div>
            {teacher?.full_name ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                Giảng viên: {teacher.full_name}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-bold text-primary lg:text-3xl">{formatVnd(price)}</p>
              {showSale ? (
                <p className="text-muted-foreground text-lg line-through">{formatVnd(origNum)}</p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-2 lg:hidden">{ctaHero}</div>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="min-w-0">
          <CourseDetailTabs
            courseId={courseId}
            detail={detail}
            enrolled={enrolled}
            loadingProgress={loadingProgress}
            lessonProgress={lessonProgress}
            enrollmentStatus={enrollmentStatus}
            canReview={canReview}
            objectives={objectives}
            targetAudience={targetAudience}
            recommendations={recommendations}
            wyl={wyl}
            requirements={requirements}
            content={content}
            faq={faq}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewComment={reviewComment}
            setReviewComment={setReviewComment}
            submittingReview={submittingReview}
            onSubmitReview={() => void submitReview()}
          />
        </div>

        <aside className="lg:sticky lg:top-20">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tóm tắt khóa học</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs">Học phí</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-primary text-xl font-bold">{formatVnd(price)}</span>
                  {showSale ? (
                    <span className="text-muted-foreground text-sm line-through">
                      {formatVnd(origNum)}
                    </span>
                  ) : null}
                </div>
              </div>
              {ctaPrimary}
              {enrolled ? (
                <Badge variant="outline" className="w-full justify-center py-2">
                  Đã đăng ký
                </Badge>
              ) : null}
              <div className="border-t border-border pt-4">
                <p className="text-muted-foreground text-xs font-medium">Giảng viên</p>
                {teacher?.full_name ? (
                  <p className="mt-1 text-sm font-medium">{teacher.full_name}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">—</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
