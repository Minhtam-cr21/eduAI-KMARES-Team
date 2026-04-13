"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { careerShortDescription } from "@/lib/assessment/career-blurbs";
import type { AssessmentResultPayload } from "@/lib/assessment/load-result";
import { mbtiBadgeClass, mbtiBlurb } from "@/lib/assessment/mbti-display";
import { cn } from "@/lib/utils";
import { BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AssessmentResultPage() {
  const router = useRouter();
  const [data, setData] = useState<AssessmentResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assessment/result");
      if (res.status === 401) {
        router.push("/login?next=/assessment/result");
        return;
      }
      if (res.status === 403 || res.status === 404) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Chưa có kết quả", {
          description: "Hãy hoàn thành bài trắc nghiệm định hướng trước.",
        });
        router.push("/assessment");
        return;
      }
      if (!res.ok) {
        toast.error("Không tải được kết quả");
        return;
      }
      const payload = (await res.json()) as AssessmentResultPayload;
      setData(payload);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground text-sm">Đang tải kết quả…</p>
      </main>
    );
  }

  const mbti = data.profile.mbti_type ?? "—";
  const { traits } = data;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Kết quả trắc nghiệm định hướng
        </h1>
        <p className="text-muted-foreground text-sm">
          Tóm tắt dựa trên câu trả lời của bạn — mang tính gợi ý.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Xu hướng MBTI (ước lượng)
          </CardTitle>
          <CardDescription>{mbtiBlurb(data.profile.mbti_type)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <span
            className={cn(
              "inline-flex rounded-full border px-4 py-1.5 text-lg font-bold tracking-wide",
              mbtiBadgeClass(data.profile.mbti_type)
            )}
          >
            {mbti}
          </span>
          {data.profile.career_orientation ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.profile.career_orientation}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điểm các trụ cột (0–100)</CardTitle>
          <CardDescription>
            Phản ánh mục tiêu, cách học, nền tảng kỹ thuật và sở thích theo bài
            test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["Động lực & mục tiêu", traits.motivation],
              ["Phong cách học", traits.learningStyle],
              ["Kỹ năng nền", traits.foundationSkills],
              ["Sở thích & định hướng", traits.interests],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">{label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {value}
                </span>
              </div>
              <Progress value={value} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điểm mạnh & điểm cần củng cố</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Điểm mạnh
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {data.career.strengths.map((s, i) => (
                <li key={`s-${i}-${s.slice(0, 24)}`}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              Cần củng cố
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {data.career.weaknesses.map((s, i) => (
                <li key={`w-${i}-${s.slice(0, 24)}`}>{s}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gợi ý nghề nghiệp</CardTitle>
          <CardDescription>
            Đây chỉ là gợi ý, hãy theo đuổi đam mê của bạn. Chúng tôi tin bạn có
            thể phát triển dựa trên điểm mạnh hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.career.suggested_careers.map((title) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <p className="font-medium text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {careerShortDescription(title)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Gợi ý khóa học
          </CardTitle>
          <CardDescription>
            Các khóa phù hợp với hồ sơ của bạn (có thể đăng ký từ trang khám
            phá).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có khóa gợi ý — hãy xem toàn bộ catalog.
            </p>
          ) : (
            data.courses.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row"
              >
                <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-32">
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{c.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {c.description ?? "Không có mô tả."}
                  </p>
                  {c.category ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {c.category}
                    </p>
                  ) : null}
                  <Link
                    href={`/student/courses/explore?courseId=${encodeURIComponent(c.id)}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "mt-3 inline-flex"
                    )}
                  >
                    Xem khóa học
                  </Link>
                </div>
              </div>
            ))
          )}
          <Link
            href="/student/courses/explore"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex"
            )}
          >
            Khám phá tất cả khóa học
          </Link>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/student"
          className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
        >
          Vào Dashboard
        </Link>
      </div>
    </main>
  );
}
