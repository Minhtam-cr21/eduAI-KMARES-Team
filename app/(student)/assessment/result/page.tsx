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
import { loadAssessmentResult, type AssessmentResultPayload } from "@/lib/assessment/load-result";
import { mbtiBadgeClass, mbtiBlurb } from "@/lib/assessment/mbti-display";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BookOpen, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

function bandTone(band: "Low" | "Medium" | "High") {
  if (band === "High") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  }
  if (band === "Medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300";
}

function bandLabel(band: "Low" | "Medium" | "High") {
  if (band === "High") return "Cao";
  if (band === "Medium") return "Trung bình";
  return "Thấp";
}

export default async function AssessmentResultPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/assessment/result");
  }

  const loaded = await loadAssessmentResult(supabase, user.id);
  if (!loaded.ok) {
    redirect("/assessment");
  }

  const data: AssessmentResultPayload = loaded.data;

  const mbti = data.profile.mbti_type ?? "—";
  const { traits } = data;
  const analysisSourceLabel =
    data.analysis_source === "openai" ? "AI + deterministic" : "Deterministic fallback";
  const pacingLabel =
    data.ai_analysis.recommended_pacing === "accelerated"
      ? "Tăng tốc"
      : data.ai_analysis.recommended_pacing === "slow"
        ? "Chậm chắc"
        : "Ổn định";
  const rubricCards = [
    {
      key: "motivation",
      label: "Motivation",
      score: data.rubric.motivation.score,
      band: data.rubric.motivation.band,
      interpretation: data.rubric.motivation.short_interpretation,
      implication: data.rubric.motivation.path_implication,
    },
    {
      key: "learning_style",
      label: "Learning style",
      score: data.rubric.learning_style.score,
      band: data.rubric.learning_style.band,
      interpretation: data.rubric.learning_style.short_interpretation,
      implication: data.rubric.learning_style.schedule_implication,
    },
    {
      key: "foundation_skills",
      label: "Foundation skills",
      score: data.rubric.foundation_skills.score,
      band: data.rubric.foundation_skills.band,
      interpretation: data.rubric.foundation_skills.short_interpretation,
      implication: data.rubric.foundation_skills.path_implication,
    },
    {
      key: "interest_alignment",
      label: "Interest alignment",
      score: data.rubric.interest_alignment.score,
      band: data.rubric.interest_alignment.band,
      interpretation: data.rubric.interest_alignment.short_interpretation,
      implication: data.rubric.interest_alignment.path_implication,
    },
  ] as const;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-16">
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
          <p className="text-xs font-medium text-muted-foreground">
            Nguồn phân tích: {analysisSourceLabel} · phiên bản{" "}
            {data.assessment_version}
          </p>
          {data.profile.career_orientation ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.profile.career_orientation}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kết luận dễ hiểu cho bạn</CardTitle>
          <CardDescription>
            Lớp giải thích này được build từ scoring hiện có, theo rubric additive
            4 trụ. Không thay đổi baseline chấm điểm cũ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Headline
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {data.student_view.headline}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Tổng quan</p>
            <p>{data.student_view.summary}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Nhịp học khuyến nghị</p>
            <p>{data.student_view.pacing_recommendation}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-foreground">Điểm mạnh nổi bật</p>
              <ul className="list-inside list-disc space-y-1">
                {data.student_view.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">Điểm cần hỗ trợ</p>
              {data.student_view.support_needs.length === 0 ? (
                <p>Chưa có điểm cần hỗ trợ nổi bật từ rubric hiện tại.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1">
                  {data.student_view.support_needs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Gợi ý bước tiếp theo</p>
            <ul className="list-inside list-disc space-y-1">
              {data.student_view.next_steps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assessment rubric chuẩn hóa</CardTitle>
          <CardDescription>
            4 trụ đều dùng thang 0–100, được map sang band `Low / Medium / High`
            theo lớp rubric additive mới.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {rubricCards.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Score {item.score}/100
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    bandTone(item.band)
                  )}
                >
                  {bandLabel(item.band)}
                </span>
              </div>
              <div className="mt-3">
                <Progress value={item.score} className="h-2" />
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{item.interpretation}</p>
                <p>
                  <span className="font-medium text-foreground">Implication: </span>
                  {item.implication}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learner profile (cấu trúc)</CardTitle>
          <CardDescription>
            Hồ sơ này được chuẩn hóa từ 20 câu MBTI và 30 câu mở rộng để làm đầu
            vào cho các phase cá nhân hóa sau.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Mục tiêu</p>
            <p>{data.learner_profile.goal_summary}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Ràng buộc hiện tại</p>
            <p>{data.learner_profile.constraint_summary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-foreground">
                Tín hiệu phong cách học
              </p>
              <ul className="list-inside list-disc space-y-1">
                {data.learner_profile.learning_style_signals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">
                Tín hiệu động lực
              </p>
              <ul className="list-inside list-disc space-y-1">
                {data.learner_profile.motivation_signals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-foreground">Sở thích nổi bật</p>
              <div className="flex flex-wrap gap-2">
                {data.learner_profile.interests.length === 0 ? (
                  <span>Chưa có tín hiệu sở thích nổi bật.</span>
                ) : (
                  data.learner_profile.interests.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                    >
                      {item}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">
                Cờ rủi ro cần lưu ý
              </p>
              {data.learner_profile.risk_flags.length === 0 ? (
                <p>Chưa có cờ rủi ro lớn từ baseline deterministic.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1">
                  {data.learner_profile.risk_flags.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phân tích học tập</CardTitle>
          <CardDescription>
            Kết quả server-side có fallback rule-based nếu OpenAI không khả dụng
            hoặc JSON không hợp lệ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Tóm tắt</p>
            <p>{data.ai_analysis.learner_summary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-foreground">
                Nhịp học khuyến nghị
              </p>
              <p>{pacingLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.teacher_view.pacing_guidance}
              </p>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">
                Phong cách giao tiếp
              </p>
              <p>{data.ai_analysis.communication_style}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-foreground">
                Chiến lược hỗ trợ
              </p>
              <ul className="list-inside list-disc space-y-1">
                {data.ai_analysis.support_strategies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">
                Động lực nên kích hoạt
              </p>
              <ul className="list-inside list-disc space-y-1">
                {data.ai_analysis.motivation_hooks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-foreground">
                Trọng tâm lộ trình về sau
              </p>
              <ul className="list-inside list-disc space-y-1">
                {data.ai_analysis.path_focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">Giải thích rủi ro</p>
              <ul className="list-inside list-disc space-y-1">
                {data.ai_analysis.risk_explanation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điểm các trụ cột gốc (0–100)</CardTitle>
          <CardDescription>
            Đây là baseline raw traits cũ, vẫn được giữ nguyên để compatibility.
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
                <div className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-32">
                  {c.thumbnail_url ? (
                    <Image
                      src={c.thumbnail_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="128px"
                      unoptimized
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
        <Link
          href="/personalized-roadmap"
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
        >
          Xem lộ trình
        </Link>
      </div>
    </main>
  );
}
