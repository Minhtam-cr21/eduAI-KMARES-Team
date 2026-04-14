"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { cn } from "@/lib/utils";
import type { AnalysisSource, ErrorAnalysis } from "@/lib/ai/error-analyzer";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Code2,
  Lightbulb,
  ListOrdered,
  MessageCircle,
  Sparkles,
  Wrench,
} from "lucide-react";

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
  tint: "rose" | "sky" | "amber" | "violet" | "emerald" | "slate";
  children: React.ReactNode;
}) {
  const ring =
    tint === "rose"
      ? "border-rose-500/20 bg-rose-500/5"
      : tint === "sky"
        ? "border-sky-500/20 bg-sky-500/5"
        : tint === "amber"
          ? "border-amber-500/20 bg-amber-500/5"
          : tint === "violet"
            ? "border-violet-500/20 bg-violet-500/5"
            : tint === "emerald"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-border bg-muted/30";
  const iconClass =
    tint === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : tint === "sky"
        ? "text-sky-600 dark:text-sky-400"
        : tint === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : tint === "violet"
            ? "text-violet-600 dark:text-violet-400"
            : tint === "emerald"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground";

  return (
    <section className={cn("rounded-xl border p-4", ring)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="text-sm text-foreground/90">{children}</div>
    </section>
  );
}

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
        <div className={cn("space-y-3", className)}>
          {showHeuristicHint ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Đang sử dụng chế độ phân tích cơ bản. Để có phân tích chi tiết hơn, hãy cấu hình{" "}
                <strong>OpenAI</strong> hoặc <strong>DeepSeek</strong> API key trong biến môi trường.
              </span>
            </p>
          ) : null}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <LessonMarkdown content={fallbackMarkdown} />
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

  return (
    <div className={cn("space-y-3", className)}>
      {showHeuristicHint ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Đang sử dụng chế độ phân tích cơ bản. Để có phân tích chi tiết hơn, hãy cấu hình{" "}
            <strong>OpenAI</strong> hoặc <strong>DeepSeek</strong> API key.
          </span>
        </p>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            Phân tích bằng mô hình AI ({analysisSource === "openai" ? "OpenAI" : "DeepSeek"}).
          </span>
        </p>
      )}

      <Section icon={AlertCircle} title="Nguyên nhân gốc rễ" tint="rose">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <LessonMarkdown content={analysis.rootCause} />
        </div>
      </Section>

      <Section icon={MessageCircle} title="Giải thích" tint="sky">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <LessonMarkdown content={analysis.explanation} />
        </div>
      </Section>

      <Section icon={Wrench} title="Cách sửa" tint="amber">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <LessonMarkdown content={analysis.solution} />
        </div>
      </Section>

      {analysis.codeExample?.trim() ? (
        <Section icon={Code2} title="Ví dụ code" tint="violet">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <LessonMarkdown
              content={`\`\`\`\n${analysis.codeExample.trim()}\n\`\`\``}
            />
          </div>
        </Section>
      ) : null}

      <Section icon={Lightbulb} title="Phòng tránh" tint="emerald">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <LessonMarkdown content={analysis.preventionTip} />
        </div>
      </Section>

      <Section icon={ListOrdered} title="Bước debug gợi ý" tint="slate">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {analysis.debugSteps.map((step, i) => (
            <li key={i} className="pl-1">
              <div className="prose prose-sm dark:prose-invert max-w-none inline">
                <LessonMarkdown content={step} />
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
