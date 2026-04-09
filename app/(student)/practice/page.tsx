"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
] as const;

type Lang = (typeof LANGUAGES)[number]["value"];

type PracticeQuestion = {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  initial_code: string;
  sample_input: string;
  sample_output: string;
  hint: string;
};

function storageKey(lang: string, qid: string) {
  return `practice_${lang}_${qid}`;
}

export default function PracticePage() {
  const [language, setLanguage] = useState<Lang>("python");
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [asking, setAsking] = useState(false);

  const fetchRandom = useCallback(
    async (lang: Lang) => {
      setLoading(true);
      setSuggestion("");
      setOutput("");
      setRunError("");
      setExitCode(null);
      try {
        const res = await fetch(`/api/practice/random?language=${lang}`);
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          toast.error("Không tải được câu hỏi", {
            description: d.error ?? res.statusText,
          });
          setQuestion(null);
          return;
        }
        const q = (await res.json()) as PracticeQuestion;
        setQuestion(q);
        const saved = localStorage.getItem(storageKey(lang, q.id));
        setCode(saved ?? q.initial_code ?? "");
      } catch (e) {
        toast.error("Lỗi mạng", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchRandom(language);
  }, [language, fetchRandom]);

  useEffect(() => {
    if (question) {
      localStorage.setItem(storageKey(language, question.id), code);
    }
  }, [code, language, question]);

  function handleLanguageChange(next: Lang) {
    setLanguage(next);
  }

  async function handleRun() {
    setRunning(true);
    setOutput("");
    setRunError("");
    setExitCode(null);
    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          stdin: question?.sample_input ?? "",
        }),
      });
      const data = (await res.json()) as {
        output?: string;
        error?: string;
        detail?: string;
        exit_code?: number;
      };
      if (!res.ok) {
        setRunError(
          data.error ?? data.detail ?? `HTTP ${res.status}`
        );
        return;
      }
      setOutput(data.output ?? "");
      setRunError(data.error ?? "");
      setExitCode(typeof data.exit_code === "number" ? data.exit_code : null);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  async function handleAskAi() {
    setAsking(true);
    setSuggestion("");
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error: runError || output || "(chưa có lỗi)",
          language,
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
      setSuggestion(data.suggestion ?? "");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAsking(false);
    }
  }

  const monacoLang =
    language === "cpp"
      ? "cpp"
      : language === "javascript"
        ? "javascript"
        : language === "java"
          ? "java"
          : "python";

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Phòng luyện code
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Chọn ngôn ngữ, giải câu hỏi ngẫu nhiên, chạy code và hỏi AI khi cần.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid min-h-[calc(100vh-8rem)] gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Cột trái: đề bài + gợi ý */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-muted-foreground text-sm">Ngôn ngữ</label>
              <select
                value={language}
                onChange={(e) =>
                  handleLanguageChange(e.target.value as Lang)
                }
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void fetchRandom(language)}
                disabled={loading}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 ml-auto rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
              >
                Câu hỏi khác
              </button>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-sm">Đang tải…</p>
            ) : question ? (
              <div>
                <h2 className="text-lg font-semibold">{question.title}</h2>
                <span className="bg-primary/10 text-primary mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium">
                  {question.difficulty}
                </span>
                <div className="prose prose-sm dark:prose-invert mt-3 max-w-none">
                  <LessonMarkdown content={question.description} />
                </div>
                {question.sample_input || question.sample_output ? (
                  <div className="mt-3 space-y-2 text-sm">
                    {question.sample_input ? (
                      <div>
                        <span className="font-medium">Input mẫu:</span>
                        <pre className="bg-muted mt-1 rounded p-2 text-xs">{question.sample_input}</pre>
                      </div>
                    ) : null}
                    {question.sample_output ? (
                      <div>
                        <span className="font-medium">Output mong đợi:</span>
                        <pre className="bg-muted mt-1 rounded p-2 text-xs">{question.sample_output}</pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {question.hint ? (
                  <details className="mt-3 text-sm">
                    <summary className="text-muted-foreground cursor-pointer font-medium">
                      Gợi ý
                    </summary>
                    <p className="text-muted-foreground mt-1">{question.hint}</p>
                  </details>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Không tìm thấy câu hỏi. Admin cần thêm dữ liệu hoặc chạy seed.
              </p>
            )}
          </div>

          <div className="flex-1 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Gợi ý AI</h2>
            <div className="mt-2 min-h-[200px] text-sm">
              {suggestion ? (
                <LessonMarkdown content={suggestion} />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Chạy code rồi bấm &quot;Hỏi AI&quot; để nhận phân tích.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: editor + output */}
        <div className="flex flex-col gap-4">
          <div className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="text-muted-foreground text-sm">Editor</span>
              <button
                type="button"
                onClick={handleRun}
                disabled={running}
                className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
              >
                {running ? "Đang chạy…" : "Run"}
              </button>
            </div>
            <div className="min-h-[360px] flex-1">
              <Editor
                height="100%"
                language={monacoLang}
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
            <pre className="bg-muted mt-2 max-h-48 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
              {output || "(stdout trống)"}
            </pre>
            {runError ? (
              <pre className="bg-destructive/10 text-destructive mt-2 max-h-40 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                {runError}
              </pre>
            ) : null}
            <button
              type="button"
              onClick={handleAskAi}
              disabled={asking}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              {asking ? "Đang hỏi AI…" : "Hỏi AI"}
            </button>
            <p className="text-muted-foreground mt-2 text-xs">
              Tối đa 3 lượt/ngày.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
