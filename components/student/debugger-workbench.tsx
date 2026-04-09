"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import Editor from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
] as const;

type Lang = (typeof LANGUAGES)[number]["value"];

const DEFAULT_CODE: Record<Lang, string> = {
  python: 'print("Hello, EduAI!")',
  javascript: 'console.log("Hello, EduAI!");',
  cpp: `#include <iostream>
int main() {
  std::cout << "Hello, EduAI!" << std::endl;
  return 0;
}`,
  java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, EduAI!");
  }
}`,
};

export function DebuggerWorkbench() {
  const [language, setLanguage] = useState<Lang>("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [running, setRunning] = useState(false);
  const [asking, setAsking] = useState(false);

  const onLanguageChange = useCallback((next: Lang) => {
    setLanguage(next);
    setCode(DEFAULT_CODE[next]);
  }, []);

  async function handleRun() {
    setRunning(true);
    setOutput("");
    setRunError("");
    setExitCode(null);
    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin: "" }),
      });

      let data: {
        output?: string;
        error?: string;
        detail?: string;
        code?: string;
        exit_code?: number;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        const msg = `Phản hồi không phải JSON (HTTP ${res.status})`;
        setRunError(msg);
        toast.error("Chạy code thất bại", { description: msg });
        return;
      }

      const serverMsg = data.error;
      const fullErr =
        serverMsg && data.detail
          ? `${serverMsg}\n\n${data.detail}`
          : (serverMsg ?? data.detail ?? res.statusText);

      if (!res.ok) {
        setOutput("");
        setRunError(fullErr);
        setExitCode(null);
        toast.error("Chạy code thất bại", {
          description: data.detail ?? serverMsg ?? res.statusText,
        });
        return;
      }

      setOutput(data.output ?? "");
      setRunError(data.error ?? "");
      setExitCode(typeof data.exit_code === "number" ? data.exit_code : null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown";
      setRunError(`Lỗi: ${msg}`);
      toast.error("Lỗi khi gọi API chạy code", { description: msg });
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
          error: runError || output || "(không có stderr riêng)",
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
        description: e instanceof Error ? e.message : "Unknown",
      });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <label htmlFor="dbg-lang" className="text-muted-foreground text-sm">
            Ngôn ngữ
          </label>
          <select
            id="dbg-lang"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Lang)}
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
            defaultLanguage={language === "cpp" ? "cpp" : language}
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
      </div>

      <div className="flex flex-col gap-4">
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
            Tối đa 3 lượt/ngày. Chỉ gửi code &amp; lỗi tới server — không lộ API
            key.
          </p>
        </div>

        <div className="flex-1 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Gợi ý AI</h2>
          <div className="mt-2 min-h-[200px] text-sm">
            {suggestion ? (
              <LessonMarkdown content={suggestion} />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Chạy code rồi bấm &quot;Hỏi AI&quot; để nhận gợi ý (tiếng Việt).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
