"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  MessageCircle,
  Play,
  Star,
  User,
} from "lucide-react";
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
  if (Number.isNaN(num) || num <= 0) return "Free";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

function Stars({ value }: { value: number }) {
  const r = Math.min(5, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"
          )}
        />
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] | null | undefined }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
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
        setDetailErr(j.error ?? "Not found");
        return;
      }
      setDetail(j);
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : "Error");
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
          toast.success("Already enrolled");
          return;
        }
        toast.error(j.error ?? "Could not enroll");
        return;
      }
      toast.success("Enrolled");
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
        toast.error(j.error ?? "Could not submit");
        return;
      }
      toast.success("Thank you for your review");
      setReviewComment("");
      await loadDetail();
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loadingDetail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-10 w-full" />
      </main>
    );
  }

  if (detailErr || !course || !detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-muted-foreground">{detailErr ?? "Not found"}</p>
        <Link href="/student/courses/explore" className="mt-4 inline-block text-primary">
          Back to explore
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
  const durationHours = course.duration_hours as number | null;
  const totalLessons = (course.total_lessons as number | null) ?? detail.lessons.length;
  const rating = Number(course.rating) || detail.review_stats.average || 0;
  const level = (course.level as string | null) ?? null;

  const objectives = course.objectives as string[] | null;
  const targetAudience = course.target_audience as string | null;
  const recommendations = course.recommendations as string | null;
  const wyl = course.what_you_will_learn as string[] | null;
  const requirements = course.requirements as string[] | null;
  const faq = course.faq;

  const canReview = enrolled && !detail.my_review;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <BackButton fallbackHref="/student/courses/explore" label="Explore" className="mb-6" />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative aspect-video bg-muted md:min-h-[280px]">
            {embed ? (
              <iframe
                title="Promo"
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
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {category?.name ? (
                <Badge variant="outline">{category.name}</Badge>
              ) : null}
              {level ? <Badge variant="secondary">{level}</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Stars value={rating} />
                <span className="tabular-nums font-medium text-foreground">
                  {rating.toFixed(1)}
                </span>
                <span>({detail.review_stats.count})</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {durationHours != null ? `${durationHours} h` : "—"}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {totalLessons} lessons
              </span>
            </div>
            {teacher?.full_name ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {teacher.full_name}
              </p>
            ) : null}
            <p className="mt-4 text-2xl font-bold text-primary">{formatVnd(price)}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {enrolled ? (
                <>
                  {firstLessonHref ? (
                    <Link
                      href={firstLessonHref}
                      className={cn(
                        buttonVariants(),
                        "inline-flex items-center justify-center"
                      )}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Continue
                    </Link>
                  ) : (
                    <Button disabled>
                      <Play className="mr-2 h-4 w-4" />
                      Continue
                    </Button>
                  )}
                  <Badge variant="outline" className="h-10 px-3 py-0 leading-10">
                    Enrolled
                  </Badge>
                </>
              ) : (
                <Button onClick={() => void enroll()} disabled={enrolling}>
                  {enrolling ? "..." : "Enroll"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="intro" className="mt-10">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="intro">Introduction</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="certificate">Certificate</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="intro" className="mt-6 space-y-8">
          <Card>
            <CardContent className="space-y-6 p-6">
              <div>
                <h3 className="mb-2 font-semibold">Objectives</h3>
                <BulletList items={objectives} />
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Target audience</h3>
                <p className="text-sm text-foreground">{targetAudience ?? "—"}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Recommendations</h3>
                <p className="text-sm text-foreground">{recommendations ?? "—"}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">What you will learn</h3>
                <BulletList items={wyl} />
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Requirements</h3>
                <BulletList items={requirements} />
              </div>
              {content ? (
                <div>
                  <h3 className="mb-2 font-semibold">Details</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
                </div>
              ) : null}
              {Array.isArray(faq) && faq.length > 0 ? (
                <div>
                  <h3 className="mb-2 font-semibold">FAQ</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {(faq as Array<{ q?: string; a?: string }>).map((item, i) => (
                      <AccordionItem key={i} value={`faq-${i}`}>
                        <AccordionTrigger className="text-left text-sm">
                          {item.q ?? `Question ${i + 1}`}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {item.a ?? "—"}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curriculum" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {loadingProgress && enrolled ? (
                <p className="text-sm text-muted-foreground">Loading progress...</p>
              ) : null}
              {detail.lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published lessons yet.</p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {detail.lessons.map((lesson, idx) => {
                    const pr = lessonProgress.get(lesson.id);
                    const done = pr?.progress_status === "completed";
                    return (
                      <AccordionItem key={lesson.id} value={lesson.id}>
                        <AccordionTrigger className="text-left text-sm">
                          <span className="flex w-full items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {lesson.order_index ?? idx + 1}
                            </span>
                            <span className="flex-1">{lesson.title}</span>
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {enrolled ? "Not completed" : "—"}
                              </span>
                            )}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-wrap gap-2 pb-2">
                            {enrolled ? (
                              <Link
                                href={`/student/courses/${courseId}/lessons/${lesson.id}`}
                                className={cn(
                                  buttonVariants({ size: "sm" }),
                                  "inline-flex items-center justify-center"
                                )}
                              >
                                <Play className="mr-1 h-3.5 w-3.5" />
                                Open lesson
                              </Link>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Enroll to access lessons.
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-end gap-8">
                <div>
                  <p className="text-4xl font-bold tabular-nums">
                    {detail.review_stats.average.toFixed(1)}
                  </p>
                  <Stars value={detail.review_stats.average} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.review_stats.count} reviews
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-1 text-xs">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const n = detail.review_stats.by_star[star] ?? 0;
                    const max = Math.max(1, detail.review_stats.count);
                    const pct = Math.round((n / max) * 100);
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-3">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums text-muted-foreground">
                          {n}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {canReview ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <h3 className="font-semibold">Write a review</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      className="rounded p-1 hover:bg-muted"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6",
                          n <= reviewRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Comment (optional)"
                  rows={3}
                />
                <Button onClick={() => void submitReview()} disabled={submittingReview}>
                  Submit review
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-3">
            {detail.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              detail.reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {r.user?.full_name ?? "Learner"}
                      </p>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment ? (
                      <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificate" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Award className="h-12 w-12 text-muted-foreground/40" />
              {enrollmentStatus === "completed" ? (
                <p className="text-sm font-medium">You have completed this course.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete all lessons to receive a certificate.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Discussion coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
