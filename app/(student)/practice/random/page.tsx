"use client";

import { PracticeAssistTabs } from "@/components/code/practice-assist-tabs";
import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisSource, ErrorAnalysis } from "@/lib/ai/error-analyzer";
import type { PracticeExercise } from "@/types/database";
import { LazyMonacoEditor } from "@/components/code/lazy-monaco-editor";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const LANGS = [
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
] as const;

const DIFFS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
  { value: "suggested", label: "Theo gợi ý AI" },
] as const;

type Lang = (typeof LANGS)[number]["value"];
type Diff = (typeof DIFFS)[number]["value"];

function monacoLang(lang: string | null): string {
  if (lang === "cpp") return "cpp";
  if (lang === "java") return "java";
  return "python";
}

export default function PracticeRandomSmartPage() {
  const [language, setLanguage] = useState<Lang>("python");
  const [difficulty, setDifficulty] = useState<Diff>("medium");
  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ErrorAnalysis | null>(null);
  const [aiSource, setAiSource] = useState<AnalysisSource | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [askingAi, setAskingAi] = useState(false);
  const [suggestReason, setSuggestReason] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setSuggestReason(null);
    setAiAnalysis(null);
    setAiSource(null);
    setAiSuggestion("");
    setOutput("");
    setRunError("");
    setExitCode(null);
    setSubmissionId(null);
    try {
      let lang: Lang = language;
      let diff: "easy" | "medium" | "hard" = "medium";

      if (difficulty === "suggested") {
        const sr = await fetch("/api/practice/next-suggestion");
        const sj = (await sr.json()) as {
          suggested_language?: Lang;
          suggested_difficulty?: "easy" | "medium" | "hard";
          reason?: string;
          error?: string;
        };
        if (!sr.ok) {
          toast.error("Không lấy được gợi ý", {
            description: sj.error ?? sr.statusText,
          });
          setLoading(false);
          return;
        }
        if (sj.suggested_language) lang = sj.suggested_language;
        if (sj.suggested_difficulty) diff = sj.suggested_difficulty;
        setLanguage(lang);
        setSuggestReason(sj.reason ?? null);
      } else {
        diff = difficulty;
      }

      const res = await fetch("/api/practice/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, difficulty: diff }),
      });
      const data = (await res.json()) as PracticeExercise & { error?: string };
      if (!res.ok) {
        toast.error("Không tạo được bài", {
          description: data.error ?? res.statusText,
        });
        setExercise(null);
        return;
      }
      setExercise(data);
      setCode(data.initial_code ?? "");
      toast.success("Đã tạo bài tập");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [difficulty, language]);

  const editorLang = useMemo(
    () => monacoLang(exercise?.language ?? null),
    [exercise?.language]
  );

  async function handleRun(includeAi: boolean) {
    if (!exercise) {
      toast.error("Chưa có bài", { description: "Bấm Tạo bài tập ngẫu nhiên trước." });
      return;
    }
    const lang = exercise.language ?? "python";
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
          language: lang,
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
        submission_id?: string;
      };
      if (!res.ok) {
        setRunError(raw.error ?? `HTTP ${res.status}`);
        toast.error("Run thất bại", { description: raw.error });
        return;
      }
      setOutput(raw.output ?? "");
      setRunError(raw.error ?? "");
      setExitCode(typeof raw.exit_code === "number" ? raw.exit_code : null);
      if (raw.submission_id) setSubmissionId(raw.submission_id);
      if (includeAi) {
        if (raw.analysis) {
          setAiAnalysis(raw.analysis);
          setAiSource(raw.analysis_source ?? null);
        }
        if (raw.ai_suggestion) setAiSuggestion(raw.ai_suggestion);
      }
      toast.success("Đã chạy và lưu lịch sử");
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
          language: exercise.language ?? "python",
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

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <BackButton fallbackHref="/student" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Phòng luyện — Random thông minh
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tạo bài từ AI hoặc ngân hàng có sẵn, chạy code và lưu{" "}
            <code className="text-xs">practice_submissions</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/practice/exercises"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Bài tập theo khóa
          </Link>
          <Link
            href="/practice"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Luyện nhanh (câu hỏi)
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Ngôn ngữ</label>
          <select
            className="block rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Độ khó</label>
          <select
            className="block rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Diff)}
          >
            {DIFFS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void generate()}
          className={cn(buttonVariants(), "mt-5")}
        >
          {loading ? "Đang tạo…" : "Tạo bài tập ngẫu nhiên"}
        </button>
      </div>

      {suggestReason ? (
        <p className="text-muted-foreground mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium text-foreground">Gợi ý: </span>
          {suggestReason}
        </p>
      ) : null}

      <div className="grid min-h-[calc(100vh-10rem)] gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            {exercise ? (
              <>
                <h2 className="text-lg font-semibold text-foreground">{exercise.title}</h2>
                {exercise.description ? (
                  <div className="prose prose-sm dark:prose-invert mt-2 max-w-none">
                    <LessonMarkdown content={exercise.description} />
                  </div>
                ) : null}
                {(exercise.input_example || exercise.output_example) && (
                  <div className="mt-4 space-y-2 text-sm">
                    {exercise.input_example ? (
                      <div>
                        <p className="font-medium text-foreground">Input mẫu</p>
                        <pre className="bg-muted mt-1 overflow-auto rounded-lg p-2 text-xs whitespace-pre-wrap">
                          {exercise.input_example}
                        </pre>
                      </div>
                    ) : null}
                    {exercise.output_example ? (
                      <div>
                        <p className="font-medium text-foreground">Output mong đợi</p>
                        <pre className="bg-muted mt-1 overflow-auto rounded-lg p-2 text-xs whitespace-pre-wrap">
                          {exercise.output_example}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Chọn ngôn ngữ và độ khó, rồi bấm &quot;Tạo bài tập ngẫu nhiên&quot;.
              </p>
            )}
          </div>

          <PracticeAssistTabs
            key={exercise?.id ?? "no-exercise"}
            exerciseId={exercise?.id ?? null}
            lessonId={null}
            language={exercise?.language ?? "python"}
            description={exercise?.description}
            inputExample={exercise?.input_example}
            outputExample={exercise?.output_example}
            submissionId={submissionId}
            aiAnalysis={aiAnalysis}
            aiSource={aiSource}
            aiFallbackMarkdown={
              !aiAnalysis && aiSuggestion.trim() ? aiSuggestion : undefined
            }
            onAskAi={() => void handleAskAi()}
            askingAi={askingAi}
            disabled={!exercise}
          />
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
                className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
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
              <p className="text-muted-foreground mt-1 text-xs">Exit code: {exitCode}</p>
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
