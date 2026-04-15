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
import { DEFAULT_COURSE_BENEFIT_CARDS } from "@/lib/i18n/course-detail-vi";
import {
  Award,
  Calendar,
  CheckCircle2,
  Gift,
  MessageCircle,
  Play,
  Star,
  TicketPercent,
  Trophy,
} from "lucide-react";
import Link from "next/link";

export type BenefitRow = {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
  display_order: number | null;
};

export type CurriculumChapterRow = {
  id: string | null;
  title: unknown;
  lessons: Array<{
    id: string;
    title: string;
    order_index: number | null;
    video_url: string | null;
    type?: string | null;
    time_estimate?: number | null;
  }>;
};

export type CourseDetailForTabs = {
  lessons: Array<{
    id: string;
    title: string;
    order_index: number | null;
    video_url: string | null;
    type?: string | null;
    time_estimate?: number | null;
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

function lessonTypeLabel(t: string | null | undefined): string {
  switch (t) {
    case "video":
      return "Video";
    case "quiz":
      return "Ki\u1EC3m tra";
    default:
      return "B\u00E0i \u0111\u1ECDc";
  }
}

function BenefitGlyph({ name }: { name: string | null | undefined }) {
  const n = (name ?? "award").toLowerCase();
  const cls = "h-8 w-8 shrink-0 text-primary";
  if (n === "trophy") return <Trophy className={cls} />;
  if (n === "calendar") return <Calendar className={cls} />;
  if (n === "gift") return <Gift className={cls} />;
  return <Award className={cls} />;
}

function LessonAccordionItems({
  lessons,
  enrolled,
  lessonProgress,
}: {
  lessons: CourseDetailForTabs["lessons"];
  enrolled: boolean;
  lessonProgress: Map<
    string,
    { progress_status: string | null; completed_at: string | null }
  >;
}) {
  if (lessons.length === 0) return null;
  return (
    <Accordion type="multiple" className="w-full">
      {lessons.map((lesson, idx) => {
        const pr = lessonProgress.get(lesson.id);
        const done = pr?.progress_status === "completed";
        const mins =
          typeof lesson.time_estimate === "number" && lesson.time_estimate > 0
            ? `${lesson.time_estimate} phút`
            : null;
        const typeLbl = lessonTypeLabel(lesson.type);
        return (
          <AccordionItem key={lesson.id} value={lesson.id}>
            <AccordionTrigger className="text-left text-sm">
              <span className="flex w-full min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {lesson.order_index ?? idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{lesson.title}</span>
                  <span className="text-muted-foreground block text-xs font-normal">
                    {typeLbl}
                    {mins ? ` · ${mins}` : ""}
                  </span>
                </span>
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
                    href={`/learn/${lesson.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "inline-flex items-center justify-center"
                    )}
                  >
                    <Play className="mr-1 h-3.5 w-3.5" />
                    Vào bài học
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">Đăng ký khóa để học bài này.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export type CourseDetailTabsProps = {
  courseId: string;
  detail: CourseDetailForTabs;
  curriculumChapters?: CurriculumChapterRow[] | null;
  benefitRows?: BenefitRow[];
  highlights?: string[] | null;
  outcomesAfter?: string[] | null;
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
  curriculumChapters = null,
  benefitRows = [],
  highlights = null,
  outcomesAfter = null,
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
  const benefitDisplay: BenefitRow[] =
    benefitRows.length > 0
      ? [...benefitRows].sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        )
      : DEFAULT_COURSE_BENEFIT_CARDS.map((c, i) => ({
          id: `default-benefit-${i}`,
          icon: c.icon,
          title: c.title,
          description: c.description,
          display_order: i,
        }));

  const chapterLayout =
    curriculumChapters &&
    curriculumChapters.length > 0 &&
    curriculumChapters.some((ch) => ch.lessons.length > 0);

  return (
    <Tabs defaultValue="intro" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
        <TabsTrigger value="intro">Giới thiệu</TabsTrigger>
        <TabsTrigger value="curriculum">Giáo trình</TabsTrigger>
        <TabsTrigger value="vouchers">Kích hoạt mã</TabsTrigger>
        <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
        <TabsTrigger value="certificate">Chứng chỉ</TabsTrigger>
        <TabsTrigger value="comments">Thảo luận</TabsTrigger>
      </TabsList>

      <TabsContent value="intro" className="mt-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Đặc quyền</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {benefitDisplay.map((b) => (
              <div
                key={b.id}
                className="flex gap-3 rounded-xl border border-border/80 bg-card/50 p-4"
              >
                <BenefitGlyph name={b.icon} />
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{b.title}</p>
                  {b.description ? (
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {b.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card>
          <CardContent className="space-y-6 p-6">
            {highlights?.length ? (
              <div>
                <h3 className="mb-2 font-semibold">{"\u0110i\u1ec3m n\u1ed5i b\u1eadt"}</h3>
                <BulletList items={highlights} />
              </div>
            ) : null}
            {outcomesAfter?.length ? (
              <div>
                <h3 className="mb-2 font-semibold">Sau khóa học</h3>
                <BulletList items={outcomesAfter} />
              </div>
            ) : null}
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
            ) : chapterLayout && curriculumChapters ? (
              <Accordion type="multiple" className="w-full">
                {curriculumChapters.map((ch, chi) => {
                  const chKey = ch.id ?? `orphan-${chi}`;
                  const chTitle = String(ch.title ?? "Chương");
                  return (
                    <AccordionItem key={String(chKey)} value={String(chKey)}>
                      <AccordionTrigger className="text-left text-sm">
                        <span className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium">{chTitle}</span>
                          <span className="text-muted-foreground text-xs font-normal">
                            ({ch.lessons.length} bài)
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0">
                        <LessonAccordionItems
                          lessons={ch.lessons}
                          enrolled={enrolled}
                          lessonProgress={lessonProgress}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <LessonAccordionItems
                lessons={detail.lessons}
                enrolled={enrolled}
                lessonProgress={lessonProgress}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="vouchers" className="mt-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex gap-3">
              <TicketPercent className="text-muted-foreground mt-0.5 h-9 w-9 shrink-0" />
              <div className="min-w-0 space-y-1">
                <h3 className="font-semibold">Mã kích hoạt &amp; voucher</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {
                    "Nh\u1EADp m\u00E3 gi\u1EA3m gi\u00E1 ho\u1EB7c m\u00E3 k\u00EDch ho\u1EA1t kh\u00F3a h\u1ECDc (t\u00EDnh n\u0103ng \u0111ang ho\u00E0n thi\u1EC7n). Hi\u1EC7n t\u1EA1i b\u1EA1n c\u00F3 th\u1EC3 \u0111\u0103ng k\u00FD tr\u1EF1c ti\u1EBFp b\u1EB1ng n\u00FAt \"\u0110\u0103ng k\u00FD ngay\" tr\u00EAn trang kh\u00F3a."
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled>
                Nhập mã kích hoạt
              </Button>
              <Button type="button" variant="outline" disabled>
                Mua mã / gói quà tặng
              </Button>
            </div>
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
