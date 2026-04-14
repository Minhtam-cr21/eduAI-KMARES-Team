"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { cn } from "@/lib/utils";
import type { AnalysisSource, ErrorAnalysis } from "@/lib/ai/error-analyzer";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Code2, Wrench } from "lucide-react";

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

export function ErrorAnalysisPanel({
  analysis,
  fallbackMarkdown,
  className,
}: Props) {
  if (!analysis) {
    if (fallbackMarkdown?.trim()) {
      return (
        <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
          <LessonMarkdown content={fallbackMarkdown.trim()} />
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
  );
}
