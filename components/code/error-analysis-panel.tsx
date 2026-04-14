"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { cn } from "@/lib/utils";
import type { AnalysisSource, ErrorAnalysis } from "@/lib/ai/error-analyzer";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Code2, Lightbulb, Sparkles, Wrench } from "lucide-react";

type Props = {
  analysis: ErrorAnalysis | null;
  analysisSource?: AnalysisSource | null;
  /** Khi API chỉ trả markdown (dữ liệu cũ) */
  fallbackMarkdown?: string;
  className?: string;
};

function Section({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tint: "rose" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const ring =
    tint === "rose"
      ? "border-rose-500/20 bg-rose-500/5"
      : tint === "amber"
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-violet-500/20 bg-violet-500/5";
  const iconClass =
    tint === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : tint === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-violet-600 dark:text-violet-400";

  return (
    <section className={cn("rounded-lg border px-3 py-2.5", ring)}>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClass)} aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      <div
        className={cn(
          "text-sm leading-snug text-foreground/90",
          "[&_.prose]:my-0 [&_.prose_p]:my-0.5 [&_.prose_li]:my-0",
          "[&_.prose]:max-w-none"
        )}
      >
        {children}
      </div>
    </section>
  );
}

const scrollBox =
  "max-h-[min(42vh,360px)] overflow-y-auto overflow-x-hidden overscroll-contain pr-1";

export function ErrorAnalysisPanel({
  analysis,
  analysisSource,
  fallbackMarkdown,
  className,
}: Props) {
  const showHeuristicHint = analysisSource === "heuristic";

  if (!analysis) {
    if (fallbackMarkdown?.trim()) {
      return (
        <div className={cn("space-y-2", className)}>
          {showHeuristicHint ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-950 dark:text-amber-100">
              <Lightbulb className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden />
              Chế độ cơ bản — thêm <strong>OpenAI</strong> hoặc <strong>DeepSeek</strong> key để gợi ý sâu hơn.
            </p>
          ) : null}
          <div className={cn(scrollBox, "prose prose-sm dark:prose-invert")}>
            <LessonMarkdown content={fallbackMarkdown.trim()} />
          </div>
        </div>
      );
    }
    return (
      <p className="text-muted-foreground text-sm italic">
        Chưa có phân tích. Chạy code hoặc bấm Hỏi AI.
      </p>
    );
  }

  const showCode = Boolean(analysis.codeExample?.trim());

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showHeuristicHint ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-950 dark:text-amber-100">
          <Lightbulb className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden />
          Chế độ cơ bản — thêm <strong>OpenAI</strong> hoặc <strong>DeepSeek</strong> key nếu cần gợi ý chi tiết hơn.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] text-foreground">
          <Sparkles className="h-3 w-3 shrink-0 text-primary" aria-hidden />
          {analysisSource === "openai" ? "OpenAI" : "DeepSeek"}
        </p>
      )}

      <div className={cn(scrollBox, "flex flex-col gap-2")}>
        <Section icon={AlertCircle} title="Nguyên nhân" tint="rose">
          <div className="prose prose-sm dark:prose-invert">
            <LessonMarkdown content={analysis.rootCause.trim() || "—"} />
          </div>
        </Section>

        <Section icon={Wrench} title="Cách sửa" tint="amber">
          <div className="prose prose-sm dark:prose-invert">
            <LessonMarkdown content={analysis.solution.trim() || "—"} />
          </div>
        </Section>

        {showCode ? (
          <Section icon={Code2} title="Ví dụ" tint="violet">
            <div className="prose prose-sm dark:prose-invert">
              <LessonMarkdown
                content={`\`\`\`\n${analysis.codeExample!.trim()}\n\`\`\``}
              />
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
