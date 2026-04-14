"use client";

import { ErrorAnalysisPanel } from "@/components/code/error-analysis-panel";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AnalysisSource, ErrorAnalysis } from "@/lib/ai/error-analyzer";
import { Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type Props = {
  exerciseId?: string | null;
  lessonId?: string | null;
  language: string;
  description?: string | null;
  inputExample?: string | null;
  outputExample?: string | null;
  submissionId?: string | null;
  aiAnalysis: ErrorAnalysis | null;
  aiSource: AnalysisSource | null;
  aiFallbackMarkdown?: string;
  onAskAi: () => void;
  askingAi: boolean;
  disabled?: boolean;
  className?: string;
};

export function PracticeAssistTabs({
  exerciseId,
  lessonId,
  language,
  description,
  inputExample,
  outputExample,
  submissionId,
  aiAnalysis,
  aiSource,
  aiFallbackMarkdown,
  onAskAi,
  askingAi,
  disabled,
  className,
}: Props) {
  const [tab, setTab] = useState("hint");
  const [solutionCode, setSolutionCode] = useState<string | null>(null);
  const [solutionSource, setSolutionSource] = useState<"database" | "ai" | null>(null);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  const canSolution =
    Boolean(exerciseId?.trim()) || Boolean(lessonId?.trim());

  const markViewed = useCallback(async () => {
    if (!submissionId?.trim()) return;
    try {
      await fetch(`/api/practice/submissions/${submissionId}/view-solution`, {
        method: "POST",
      });
    } catch {
      /* ignore */
    }
  }, [submissionId]);

  const loadSolution = useCallback(
    async (mode: "normal" | "retry" = "normal") => {
    if (!canSolution) return;
    if (loadingSolution) return;
    if (mode === "normal" && solutionCode?.trim()) return;

    setSolutionError(null);
    setLoadingSolution(true);
    try {
      const q = exerciseId?.trim()
        ? `exerciseId=${encodeURIComponent(exerciseId)}`
        : `lessonId=${encodeURIComponent(lessonId!)}`;

      const res = await fetch(`/api/practice/solution?${q}`);
      const data = (await res.json()) as {
        solution?: string | null;
        source?: "database" | null;
        error?: string;
      };

      if (!res.ok) {
        setSolutionError(data.error ?? "Không tải được đáp án");
        setSolutionCode(null);
        setSolutionSource(null);
        return;
      }

      if (data.solution?.trim()) {
        setSolutionCode(data.solution.trim());
        setSolutionSource("database");
        void markViewed();
        return;
      }

      const gen = await fetch("/api/practice/generate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(exerciseId?.trim() ? { exerciseId } : { lessonId }),
          language,
          description: description ?? undefined,
          inputExample: inputExample ?? undefined,
          outputExample: outputExample ?? undefined,
        }),
      });
      const gj = (await gen.json()) as {
        solution?: string;
        source?: "ai" | "database";
        error?: string;
      };

      if (!gen.ok) {
        setSolutionError(gj.error ?? "Không tạo được đáp án");
        setSolutionCode(null);
        setSolutionSource(null);
        return;
      }

      if (gj.solution?.trim()) {
        setSolutionCode(gj.solution.trim());
        setSolutionSource(gj.source === "database" ? "database" : "ai");
        void markViewed();
      } else {
        setSolutionError("Không nhận được code đáp án.");
        setSolutionCode(null);
        setSolutionSource(null);
      }
    } catch (e) {
      setSolutionError(e instanceof Error ? e.message : "Lỗi mạng");
      setSolutionCode(null);
      setSolutionSource(null);
    } finally {
      setLoadingSolution(false);
    }
  },
  [
    canSolution,
    description,
    exerciseId,
    inputExample,
    language,
    lessonId,
    loadingSolution,
    markViewed,
    outputExample,
    solutionCode,
  ]);

  const onViewSolution = useCallback(() => {
    setTab("solution");
    void loadSolution("normal");
  }, [loadSolution]);

  const onTabChange = useCallback(
    (v: string) => {
      setTab(v);
      if (v === "solution" && canSolution) {
        void loadSolution("normal");
      }
    },
    [canSolution, loadSolution]
  );

  async function copySolution() {
    if (!solutionCode?.trim()) return;
    try {
      await navigator.clipboard.writeText(solutionCode);
      toast.success("Đã sao chép code");
    } catch {
      toast.error("Không sao chép được");
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Gợi ý &amp; đáp án</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAskAi}
            disabled={askingAi || disabled}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            {askingAi ? "Đang hỏi…" : "Hỏi AI"}
          </button>
          {canSolution ? (
            <button
              type="button"
              onClick={onViewSolution}
              disabled={disabled || loadingSolution}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {loadingSolution ? "Đang tải…" : "Xem đáp án"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        Gợi ý: ngắn gọn. Đáp án: code mẫu (nếu có trong hệ thống hoặc tạo tự động).
      </p>

      <Tabs value={tab} onValueChange={onTabChange} className="mt-3">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="hint" className="text-xs sm:text-sm">
            Gợi ý
          </TabsTrigger>
          <TabsTrigger value="solution" className="text-xs sm:text-sm" disabled={!canSolution}>
            Đáp án
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hint" className="mt-2">
          <div className="max-h-[min(42vh,360px)] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
            <ErrorAnalysisPanel
              analysis={aiAnalysis}
              analysisSource={aiSource}
              fallbackMarkdown={aiFallbackMarkdown}
            />
          </div>
        </TabsContent>

        <TabsContent value="solution" className="mt-2">
          <div className="max-h-[min(42vh,360px)] min-h-0 space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
            {loadingSolution ? (
              <p className="text-muted-foreground text-sm">Đang tải đáp án…</p>
            ) : solutionError ? (
              <div className="space-y-2">
                <p className="text-destructive text-sm">{solutionError}</p>
                <button
                  type="button"
                  onClick={() => void loadSolution("retry")}
                  disabled={loadingSolution}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                >
                  Thử lại
                </button>
              </div>
            ) : solutionCode ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    {solutionSource === "database"
                      ? "Từ ngân hàng đề"
                      : solutionSource === "ai"
                        ? "Tạo tự động"
                        : "Đáp án"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copySolution()}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "h-8 gap-1 px-2 text-xs"
                    )}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy
                  </button>
                </div>
                <pre className="bg-muted max-h-[min(38vh,320px)] overflow-auto rounded-lg border border-border p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {solutionCode}
                </pre>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Bấm &quot;Xem đáp án&quot; để tải hoặc tạo code mẫu.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
