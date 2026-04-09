"use client";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PracticeExercise } from "@/types/database";
import Editor from "@monaco-editor/react";
import { Code2, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ListResponse = {
  data: PracticeExercise[];
  count: number;
  page: number;
  limit: number;
};

function monacoLang(lang: string | null): string {
  if (lang === "cpp") return "cpp";
  if (lang === "java") return "java";
  if (lang === "javascript") return "javascript";
  return "python";
}

function difficultyVariant(d: string | null) {
  if (d === "easy") return "success" as const;
  if (d === "hard") return "destructive" as const;
  return "secondary" as const;
}

export default function StudentPracticeListPage() {
  const [exercises, setExercises] = useState<PracticeExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [askingAi, setAskingAi] = useState(false);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/exercises?page=1&limit=100");
      const json = (await res.json()) as ListResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? res.statusText);
        return;
      }
      setExercises(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises;
    const q = search.toLowerCase();
    return exercises.filter(
      (ex) =>
        ex.title.toLowerCase().includes(q) ||
        (ex.language?.toLowerCase().includes(q) ?? false)
    );
  }, [exercises, search]);

  const selected = useMemo(
    () => exercises.find((ex) => ex.id === selectedId) ?? null,
    [exercises, selectedId]
  );

  function selectExercise(ex: PracticeExercise) {
    setSelectedId(ex.id);
    setCode(ex.initial_code ?? "");
    setOutput("");
    setRunError("");
    setExitCode(null);
    setAiSuggestion("");
  }

  async function handleRun(includeAi: boolean) {
    if (!selected) return;
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
          exercise_id: selected.id,
          code,
          language: selected.language ?? "python",
          stdin: "",
          include_ai: includeAi,
        }),
      });
      const data = (await res.json()) as {
        output?: string;
        error?: string;
        exit_code?: number;
        ai_suggestion?: string | null;
      };
      if (!res.ok) {
        setRunError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setOutput(data.output ?? "");
      setRunError(data.error ?? "");
      setExitCode(typeof data.exit_code === "number" ? data.exit_code : null);
      if (includeAi && data.ai_suggestion) {
        setAiSuggestion(data.ai_suggestion);
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  async function handleAskAi() {
    if (!selected) return;
    setAskingAi(true);
    setAiSuggestion("");
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error: runError || output || "(chưa có lỗi)",
          language: selected.language ?? "python",
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
      <BackButton fallbackHref="/student" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Code2 className="h-6 w-6 text-primary" />
            Bài tập luyện code
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn bài từ danh sách bên trái, viết code và chạy ngay.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/practice"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Phòng luyện (random)
          </Link>
          <Link
            href="/student"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-12">
          <Code2 className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            Chưa có bài tập. Hãy liên hệ giáo viên để được thêm bài tập luyện
            code.
          </p>
          <Link
            href="/student/connections"
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Kết nối giáo viên →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm bài tập…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Không tìm thấy bài nào.
                </p>
              ) : (
                filtered.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => selectExercise(ex)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition",
                      selectedId === ex.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {ex.title}
                    </span>
                    <div className="flex gap-1.5">
                      <Badge
                        variant={difficultyVariant(ex.difficulty)}
                        className="text-[10px]"
                      >
                        {ex.difficulty ?? "—"}
                      </Badge>
                      {ex.language && (
                        <Badge variant="outline" className="text-[10px]">
                          {ex.language}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex flex-col gap-4">
            {!selected ? (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  ← Chọn một bài tập để bắt đầu
                </p>
              </div>
            ) : (
              <>
                {/* Exercise info */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      {selected.title}
                    </h2>
                    <div className="flex gap-1.5">
                      <Badge variant={difficultyVariant(selected.difficulty)}>
                        {selected.difficulty}
                      </Badge>
                      {selected.language && (
                        <Badge variant="outline">{selected.language}</Badge>
                      )}
                    </div>
                  </div>
                  {selected.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {selected.description}
                    </p>
                  )}
                </div>

                {/* Editor */}
                <div className="flex min-h-[400px] flex-col rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
                    <span className="text-sm text-muted-foreground">
                      {selected.language ?? "python"}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRun(false)}
                        disabled={running}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      >
                        {running ? "Đang chạy…" : "Run"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRun(true)}
                        disabled={running}
                        className="rounded-lg bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-60"
                      >
                        Run + AI
                      </button>
                    </div>
                  </div>
                  <div className="min-h-[350px] flex-1">
                    <Editor
                      height="100%"
                      language={monacoLang(selected.language)}
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

                {/* Output */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Output
                    </h3>
                    {exitCode !== null && (
                      <span className="text-xs text-muted-foreground">
                        exit: {exitCode}
                      </span>
                    )}
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                    {output || "(stdout trống)"}
                  </pre>
                  {runError && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-destructive/10 p-3 text-xs text-destructive whitespace-pre-wrap">
                      {runError}
                    </pre>
                  )}

                  {aiSuggestion && (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-1 text-xs font-semibold text-primary">
                        Gợi ý AI
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {aiSuggestion}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleAskAi()}
                    disabled={askingAi}
                    className="mt-3 w-full rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-60"
                  >
                    {askingAi ? "Đang hỏi AI…" : "Hỏi AI (tối đa 3 lượt/ngày)"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
