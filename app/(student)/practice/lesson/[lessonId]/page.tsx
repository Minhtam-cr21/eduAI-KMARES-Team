"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RunCodeLanguage } from "@/lib/code-runner";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type LessonPayload = {
  lesson: {
    id: string;
    course_id: string;
    title: string;
    content: string | null;
    code_template: string | null;
  };
  course: { id: string; title: string | null };
};

const LANG_OPTIONS: { value: RunCodeLanguage; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

function guessLang(template: string): RunCodeLanguage {
  if (/public\s+class\s+\w+/.test(template)) return "java";
  if (/#include\s*</.test(template)) return "cpp";
  return "python";
}

function monacoLang(lang: RunCodeLanguage): string {
  if (lang === "cpp") return "cpp";
  if (lang === "java") return "java";
  return "python";
}

export default function PracticeLessonCodingPage() {
  const params = useParams();
  const lessonId = typeof params.lessonId === "string" ? params.lessonId : "";

  const [payload, setPayload] = useState<LessonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [runLang, setRunLang] = useState<RunCodeLanguage>("python");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [askingAi, setAskingAi] = useState(false);

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/course-lessons/${lessonId}`);
      const data = (await res.json()) as LessonPayload & { error?: string };
      if (!res.ok) {
        toast.error("Không tải được bài", { description: data.error });
        setPayload(null);
        return;
      }
      setPayload(data);
      const tpl = data.lesson.code_template ?? "";
      setCode(tpl);
      setRunLang(guessLang(tpl));
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const editorLang = useMemo(() => monacoLang(runLang), [runLang]);

  async function handleRun(includeAi: boolean) {
    if (!lessonId) return;
    setRunning(true);
    setOutput("");
    setRunError("");
    setExitCode(null);
    if (includeAi) setAiSuggestion("");
    try {
      const res = await fetch("/api/practice/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          code,
          language: runLang,
          stdin: "",
          include_ai: includeAi,
        }),
      });
      const raw = (await res.json()) as {
        output?: string;
        error?: string;
        exit_code?: number;
        ai_suggestion?: string | null;
      };
      if (!res.ok) {
        setRunError(raw.error ?? `HTTP ${res.status}`);
        toast.error("Run thất bại", { description: raw.error });
        return;
      }
      setOutput(raw.output ?? "");
      setRunError(raw.error ?? "");
      setExitCode(typeof raw.exit_code === "number" ? raw.exit_code : null);
      if (includeAi && raw.ai_suggestion) {
        setAiSuggestion(raw.ai_suggestion);
      }
      toast.success("Đã chạy và lưu lịch sử (theo lesson)");
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  async function handleAskAi() {
    setAskingAi(true);
    setAiSuggestion("");
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error: runError || output || "(chưa có lỗi rõ)",
          language: runLang,
        }),
      });
      const data = (await res.json()) as { suggestion?: string; error?: string };
      if (res.status === 429) {
        toast.error("Hết lượt AI", { description: data.error });
        return;
      }
      if (!res.ok) {
        toast.error("AI không phản hồi", { description: data.error });
        return;
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
      <BackButton fallbackHref="/practice/exercises" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {loading ? "Đang tải…" : payload?.lesson.title ?? "Bài học"}
          </h1>
          {payload?.course.title ? (
            <p className="text-muted-foreground mt-1 text-sm">{payload.course.title}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/practice/exercises"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← Theo khóa
          </Link>
          <Link
            href="/practice/random"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Random AI
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Ngôn ngữ chạy:</span>
        <select
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          value={runLang}
          onChange={(e) => setRunLang(e.target.value as RunCodeLanguage)}
        >
          {LANG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-[calc(100vh-8rem)] gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            {payload?.lesson.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <LessonMarkdown content={payload.lesson.content} />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Không có nội dung lý thuyết.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Gợi ý AI</h2>
            <div className="mt-2 min-h-[100px] text-sm">
              {aiSuggestion ? (
                <LessonMarkdown content={aiSuggestion} />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Dùng Run + AI hoặc Hỏi AI sau khi chạy.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <button
                type="button"
                onClick={() => void handleRun(false)}
                disabled={running || loading}
                className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
              >
                {running ? "Đang chạy…" : "Run"}
              </button>
              <button
                type="button"
                onClick={() => void handleRun(true)}
                disabled={running || loading}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Run + AI
              </button>
            </div>
            <div className="min-h-[360px] flex-1">
              <Editor
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
            <button
              type="button"
              onClick={() => void handleAskAi()}
              disabled={askingAi}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "mt-3 w-full"
              )}
            >
              {askingAi ? "Đang hỏi AI…" : "Hỏi AI (lượt/ngày)"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
