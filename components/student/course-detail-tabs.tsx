"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Award, CheckCircle2, MessageCircle, Play, Star } from "lucide-react";
import Link from "next/link";

export type CourseDetailForTabs = {
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
};

function StarRow({ value }: { value: number }) {
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

export type CourseDetailTabsProps = {
  courseId: string;
  detail: CourseDetailForTabs;
  enrolled: boolean;
  loadingProgress: boolean;
  lessonProgress: Map<
    string,
    { progress_status: string | null; completed_at: string | null }
  >;
  enrollmentStatus: string | null;
  canReview: boolean;
  objectives: string[] | null;
  targetAudience: string | null;
  recommendations: string | null;
  wyl: string[] | null;
  requirements: string[] | null;
  content: string | null;
  faq: unknown;
  reviewRating: number;
  setReviewRating: (n: number) => void;
  reviewComment: string;
  setReviewComment: (s: string) => void;
  submittingReview: boolean;
  onSubmitReview: () => void;
};

export function CourseDetailTabs({
  courseId,
  detail,
  enrolled,
  loadingProgress,
  lessonProgress,
  enrollmentStatus,
  canReview,
  objectives,
  targetAudience,
  recommendations,
  wyl,
  requirements,
  content,
  faq,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  submittingReview,
  onSubmitReview,
}: CourseDetailTabsProps) {
  return (
    <Tabs defaultValue="intro" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
        <TabsTrigger value="intro">Giới thiệu</TabsTrigger>
        <TabsTrigger value="curriculum">Nội dung</TabsTrigger>
        <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
        <TabsTrigger value="certificate">Chứng chỉ</TabsTrigger>
        <TabsTrigger value="comments">Thảo luận</TabsTrigger>
      </TabsList>

      <TabsContent value="intro" className="mt-6 space-y-8">
        <Card>
          <CardContent className="space-y-6 p-6">
            <div>
              <h3 className="mb-2 font-semibold">Mục tiêu</h3>
              <BulletList items={objectives} />
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Đối tượng</h3>
              <p className="text-sm text-foreground">{targetAudience ?? "—"}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Gợi ý</h3>
              <p className="text-sm text-foreground">{recommendations ?? "—"}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Bạn sẽ học được</h3>
              <BulletList items={wyl} />
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Yêu cầu</h3>
              <BulletList items={requirements} />
            </div>
            {content ? (
              <div>
                <h3 className="mb-2 font-semibold">Chi tiết</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
              </div>
            ) : null}
            {Array.isArray(faq) && faq.length > 0 ? (
              <div>
                <h3 className="mb-2 font-semibold">Câu hỏi thường gặp</h3>
                <Accordion type="single" collapsible className="w-full">
                  {(faq as Array<{ q?: string; a?: string }>).map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-sm">
                        {item.q ?? `Câu hỏi ${i + 1}`}
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
              <p className="text-sm text-muted-foreground">Đang tải tiến độ…</p>
            ) : null}
            {detail.lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có bài học được xuất bản.
              </p>
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
                              {enrolled ? "Chưa xong" : "—"}
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
                              Vào bài học
                            </Link>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Đăng ký khóa để học bài này.
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
                <StarRow value={detail.review_stats.average} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail.review_stats.count} đánh giá
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
              <h3 className="font-semibold">Viết đánh giá</h3>
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
                placeholder="Nhận xét (tùy chọn)"
                rows={3}
              />
              <Button onClick={() => void onSubmitReview()} disabled={submittingReview}>
                Gửi đánh giá
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {detail.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đánh giá.</p>
          ) : (
            detail.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.user?.full_name ?? "Học viên"}</p>
                    <StarRow value={r.rating} />
                  </div>
                  {r.comment ? (
                    <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("vi-VN")}
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
              <p className="text-sm font-medium">Bạn đã hoàn thành khóa học.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Hoàn thành các bài học để nhận chứng chỉ (sắp ra mắt).
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="comments" className="mt-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Khu vực thảo luận sắp có.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
