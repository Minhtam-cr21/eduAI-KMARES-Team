"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LessonMarkdown } from "@/components/student/lesson-markdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <p className="text-muted-foreground p-4 text-sm">Đang tải trình soạn thảo…</p>
  ),
});

type ExerciseRow = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  hint_logic: string | null;
  code_hint: string | null;
  initial_code: string | null;
  language: string;
  sample_input: string | null;
  sample_output: string | null;
  order_index: number;
};

const LANG_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
] as const;

type Lang = (typeof LANG_OPTIONS)[number]["value"];

function normalizeLang(v: string | null | undefined): Lang {
  const s = (v ?? "python").toLowerCase();
  if (s === "javascript" || s === "js") return "javascript";
  if (s === "cpp" || s === "c++") return "cpp";
  if (s === "java") return "java";
  return "python";
}

function storageCodeKey(exerciseId: string) {
  return `eduai_debug_code_${exerciseId}`;
}

function aiStorageKey() {
  const d = new Date().toISOString().slice(0, 10);
  return `eduai_ai_suggest_count_${d}`;
}

function getLocalAiCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(aiStorageKey());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function incrementLocalAiCount(): void {
  const n = getLocalAiCount();
  localStorage.setItem(aiStorageKey(), String(n + 1));
}

const AI_DAILY = 3;

export function DebuggerExerciseClient() {
  const searchParams = useSearchParams();
  const exerciseId = searchParams.get("exerciseId");

  const [loading, setLoading] = useState(false);
  const [exercise, setExercise] = useState<ExerciseRow | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [language, setLanguage] = useState<Lang>("python");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [asking, setAsking] = useState(false);
  const [localAiUsed, setLocalAiUsed] = useState(0);

  const refreshAiCount = useCallback(() => {
    setLocalAiUsed(getLocalAiCount());
  }, []);

  useEffect(() => {
    refreshAiCount();
    const onFocus = () => refreshAiCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === aiStorageKey() || e.key === null) refreshAiCount();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshAiCount]);

  const localAiLeft = Math.max(0, AI_DAILY - localAiUsed);

  const loadExercise = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/exercises/${id}`);
      const data = (await res.json()) as {
        exercise?: ExerciseRow;
        error?: string;
      };
      if (res.status === 404) {
        setFetchError(data.error ?? "Không tìm thấy bài tập.");
        setExercise(null);
        return;
      }
      if (!res.ok) {
        setFetchError(data.error ?? res.statusText);
        setExercise(null);
        return;
      }
      if (!data.exercise) {
        setFetchError("Dữ liệu không hợp lệ.");
        setExercise(null);
        return;
      }
      setExercise(data.exercise);
      const lang = normalizeLang(data.exercise.language);
      setLanguage(lang);

      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem(storageCodeKey(id))
          : null;
      setCode(
        saved ??
          data.exercise.initial_code?.trim() ??
          defaultSnippet(lang)
      );
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Lỗi mạng");
      setExercise(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!exerciseId) return;
    void loadExercise(exerciseId);
  }, [exerciseId, loadExercise]);

  useEffect(() => {
    if (!exerciseId || !exercise) return;
    const t = window.setTimeout(() => {
      localStorage.setItem(storageCodeKey(exerciseId), code);
    }, 300);
    return () => window.clearTimeout(t);
  }, [code, exerciseId, exercise]);

  async function handleRun() {
    setRunning(true);
    setOutput("");
    setRunError("");
    setExitCode(null);
    try {
      const stdin = exercise?.sample_input?.trim() ?? "";
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      let data: {
        output?: string;
        error?: string;
        detail?: string;
        exit_code?: number;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        toast.error("Phản hồi không phải JSON", {
          description: `HTTP ${res.status}`,
        });
        return;
      }
      const fullErr =
        data.error && data.detail
          ? `${data.error}\n\n${data.detail}`
          : (data.error ?? data.detail ?? res.statusText);
      if (!res.ok) {
        setRunError(fullErr);
        toast.error("Chạy code thất bại", { description: fullErr });
        return;
      }
      setOutput(data.output ?? "");
      setRunError(data.error ?? "");
      setExitCode(typeof data.exit_code === "number" ? data.exit_code : null);
    } catch (e) {
      toast.error("Lỗi khi chạy code", {
        description: e instanceof Error ? e.message : "Unknown",
      });
    } finally {
      setRunning(false);
    }
  }

  async function askAI() {
    if (getLocalAiCount() >= AI_DAILY) {
      toast.error("Đã hết lượt hỏi AI hôm nay (theo trình duyệt).");
      return;
    }
    setAsking(true);
    setSuggestion("");
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error: runError || output || "(chưa có lỗi rõ ràng)",
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
      incrementLocalAiCount();
      setLocalAiUsed(getLocalAiCount());
      setSuggestion(data.suggestion ?? "");
      toast.success("Đã nhận gợi ý");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : "Unknown",
      });
    } finally {
      setAsking(false);
    }
  }

  if (!exerciseId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Không có bài tập</CardTitle>
          <CardDescription>
            Mở trang thực hành từ bài học hoặc thêm{" "}
            <code className="text-foreground">?exerciseId=</code> vào URL.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Đang tải bài tập…
      </p>
    );
  }

  if (fetchError || !exercise) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Không tải được bài tập</CardTitle>
          <CardDescription>{fetchError ?? "Unknown error"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard"
            className="border-input bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium"
          >
            ← Dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-4 md:grid-cols-2 md:gap-6">
      <ScrollArea className="h-[min(70vh,720px)] rounded-xl border border-border md:h-[calc(100vh-12rem)]">
        <div className="space-y-4 p-1 pr-3">
          <Card>
            <CardHeader>
              <CardTitle>Đề bài</CardTitle>
              <CardDescription>{exercise.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exercise.description?.trim() ? (
                <LessonMarkdown content={exercise.description} />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Chưa có mô tả đề bài.
                </p>
              )}
              {(exercise.sample_input || exercise.sample_output) && (
                <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
                  {exercise.sample_input ? (
                    <div>
                      <span className="font-medium">Input mẫu:</span>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">
                        {exercise.sample_input}
                      </pre>
                    </div>
                  ) : null}
                  {exercise.sample_output ? (
                    <div>
                      <span className="font-medium">Output mẫu:</span>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">
                        {exercise.sample_output}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {(exercise.hint_logic?.trim() || exercise.code_hint?.trim()) && (
            <Accordion type="multiple" className="w-full rounded-xl border px-3">
              {exercise.hint_logic?.trim() ? (
                <AccordionItem value="logic">
                  <AccordionTrigger>Logic gợi ý</AccordionTrigger>
                  <AccordionContent>
                    <LessonMarkdown content={exercise.hint_logic} />
                  </AccordionContent>
                </AccordionItem>
              ) : null}
              {exercise.code_hint?.trim() ? (
                <AccordionItem value="code">
                  <AccordionTrigger>Gợi ý code</AccordionTrigger>
                  <AccordionContent>
                    <LessonMarkdown content={exercise.code_hint} />
                  </AccordionContent>
                </AccordionItem>
              ) : null}
            </Accordion>
          )}
        </div>
      </ScrollArea>

      <div className="flex min-h-[420px] flex-col gap-4">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-muted-foreground shrink-0 text-sm">
                  Ngôn ngữ
                </span>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as Lang)}
                >
                  <SelectTrigger className="w-[min(100%,160px)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANG_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRun}
                  disabled={running}
                >
                  {running ? "Đang chạy…" : "Run"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void askAI()}
                  disabled={asking || localAiLeft <= 0}
                  className="min-w-0 shrink"
                >
                  {asking
                    ? `Đang hỏi… (${localAiLeft}/${AI_DAILY})`
                    : `❓ Hỏi AI (${localAiLeft}/${AI_DAILY})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[280px] flex-1 flex-col gap-3 px-3 pb-3">
            <div className="min-h-[220px] flex-1 overflow-hidden rounded-lg border border-border">
              <Editor
                height="280px"
                language={
                  language === "cpp"
                    ? "cpp"
                    : language === "javascript"
                      ? "javascript"
                      : language === "java"
                        ? "java"
                        : "python"
                }
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
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Output / lỗi
                {exitCode !== null ? ` · exit ${exitCode}` : ""}
              </p>
              <pre className="bg-muted max-h-36 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                {output || "(stdout trống)"}
              </pre>
              {runError ? (
                <pre className="bg-destructive/10 text-destructive mt-2 max-h-28 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                  {runError}
                </pre>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              Hỏi AI: còn {localAiLeft}/{AI_DAILY} lượt/ngày (trình duyệt) — server
              cũng giới hạn.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gợi ý AI</CardTitle>
          </CardHeader>
          <CardContent className="max-h-56 overflow-auto text-sm">
            {suggestion ? (
              <LessonMarkdown content={suggestion} />
            ) : (
              <p className="text-muted-foreground italic">
                Chạy code, sau đó bấm &quot;Hỏi AI&quot; để nhận gợi ý (tiếng Việt).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function defaultSnippet(lang: Lang): string {
  switch (lang) {
    case "javascript":
      return 'console.log("Hello, EduAI!");';
    case "cpp":
      return `#include <iostream>\nint main() {\n  std::cout << "Hello" << std::endl;\n  return 0;\n}`;
    case "java":
      return `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}`;
    default:
      return 'print("Hello, EduAI!")';
  }
}
