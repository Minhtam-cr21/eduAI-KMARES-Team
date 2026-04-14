"use client";

import { ErrorAnalysisPanel } from "@/components/code/error-analysis-panel";
import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisSource, ErrorAnalysis } from "@/lib/ai/error-analyzer";
import type { PracticeExercise } from "@/types/database";
import { LazyMonacoEditor } from "@/components/code/lazy-monaco-editor";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function monacoLang(lang: string | null): string {
  if (lang === "cpp") return "cpp";
  if (lang === "java") return "java";
  return "python";
}

export default function PracticeExercisePage() {
  const params = useParams();
  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId : "";

  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ErrorAnalysis | null>(null);
  const [aiSource, setAiSource] = useState<AnalysisSource | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [askingAi, setAskingAi] = useState(false);

  const load = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/practice/exercises?id=${exerciseId}`);
      const data = (await res.json()) as PracticeExercise & { error?: string };
      if (!res.ok) {
        toast.error("Không tải được bài", {
          description: data.error ?? res.statusText,
        });
        setExercise(null);
        return;
      }
      setExercise(data);
      setCode(data.initial_code ?? "");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const language = exercise?.language ?? "python";

  async function handleRun(includeAi: boolean) {
    if (!exercise) return;
    setRunning(true);
    setOutput("");
    setRunError("");
    setExitCode(null);
    if (includeAi) {
      setAiAnalysis(null);
      setAiSource(null);
      setAiSuggestion("");
    }
    try {
      const res = await fetch("/api/practice/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: exercise.id,
          code,
          language,
          stdin: "",
          include_ai: includeAi,
        }),
      });
      const raw = (await res.json()) as {
        output?: string;
        error?: string;
        exit_code?: number;
        ai_suggestion?: string | null;
        analysis?: ErrorAnalysis;
        analysis_source?: AnalysisSource;
      };
      if (!res.ok) {
        setRunError(raw.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = raw;
      setOutput(data.output ?? "");
      setRunError(data.error ?? "");
      setExitCode(typeof data.exit_code === "number" ? data.exit_code : null);
      if (includeAi) {
        if (data.analysis) {
          setAiAnalysis(data.analysis);
          setAiSource(data.analysis_source ?? null);
        }
        if (data.ai_suggestion) setAiSuggestion(data.ai_suggestion);
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  async function handleAskAi() {
    if (!exercise) return;
    setAskingAi(true);
    setAiAnalysis(null);
    setAiSource(null);
    setAiSuggestion("");
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          ...(runError.trim() ? { error: runError } : {}),
          ...(output.trim() ? { output } : {}),
          ...(exercise.input_example?.trim()
            ? { input_example: exercise.input_example }
            : {}),
          ...(exercise.output_example?.trim()
            ? { expected_output: exercise.output_example }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        suggestion?: string;
        analysis?: ErrorAnalysis;
        analysis_source?: AnalysisSource;
        error?: string;
      };
      if (res.status === 429) {
        toast.error("Hết lượt AI", { description: data.error });
        return;
      }
      if (!res.ok) {
        toast.error("AI không phản hồi", { description: data.error });
        return;
      }
      if (data.analysis) {
        setAiAnalysis(data.analysis);
        setAiSource(data.analysis_source ?? null);
      }
      setAiSuggestion(data.suggestion ?? "");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAskingAi(false);
    }
  }

  const editorLang = useMemo(
    () => monacoLang(exercise?.language ?? null),
    [exercise?.language]
  );

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <BackButton fallbackHref="/student/practice" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {loading ? "Đang tải…" : exercise?.title ?? "Bài tập"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Run lưu vào lịch sử luyện tập (bảng practice_submissions).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/practice"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← Danh sách bài
          </Link>
          <Link
            href="/practice"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Phòng luyện (random)
          </Link>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-8rem)] gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Đang tải đề…</p>
            ) : exercise?.description ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <LessonMarkdown content={exercise.description} />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Không có mô tả.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Gợi ý AI</h2>
              <button
                type="button"
                onClick={() => void handleAskAi()}
                disabled={askingAi}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                {askingAi ? "Đang hỏi…" : "Hỏi AI"}
              </button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Hiển thị Markdown · tối đa 3 lượt/ngày khi bấm Hỏi AI.
            </p>
            <div className="mt-2 min-h-0 text-sm">
              <ErrorAnalysisPanel
                analysis={aiAnalysis}
                analysisSource={aiSource}
                fallbackMarkdown={
                  !aiAnalysis && aiSuggestion.trim() ? aiSuggestion : undefined
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <span className="text-muted-foreground text-sm">
                {exercise?.language ?? "—"}
              </span>
              <button
                type="button"
                onClick={() => void handleRun(false)}
                disabled={running || !exercise}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "ml-auto"
                )}
              >
                {running ? "Đang chạy…" : "Run"}
              </button>
              <button
                type="button"
                onClick={() => void handleRun(true)}
                disabled={running || !exercise}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Run + AI
              </button>
            </div>
            <div className="min-h-[360px] flex-1">
              <LazyMonacoEditor
                height="100%"
                language={editorLang}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Output / lỗi</h2>
            {exitCode !== null && (
              <p className="text-muted-foreground mt-1 text-xs">
                Exit code: {exitCode}
              </p>
            )}
            <pre className="bg-muted mt-2 max-h-40 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
              {output || "(stdout trống)"}
            </pre>
            {runError ? (
              <pre className="bg-destructive/10 text-destructive mt-2 max-h-40 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                {runError}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}