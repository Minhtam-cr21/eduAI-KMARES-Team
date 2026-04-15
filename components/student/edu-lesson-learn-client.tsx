"use client";

import { LazyMonacoEditor } from "@/components/code/lazy-monaco-editor";
import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed-url";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export type EduContentBlock = {
  id: string;
  content_type: string;
  order: number;
  content_data: Record<string, unknown>;
};

type QuizQuestion = {
  id?: string;
  type?: string;
  question?: string;
  options?: string[];
  correct_answer?: unknown;
};

export function EduLessonLearnClient({
  courseId,
  lessonId,
  courseTitle,
  lessonTitle,
  contents,
  enrolled,
  initialCompleted,
}: {
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  contents: EduContentBlock[];
  enrolled: boolean;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const sorted = useMemo(
    () => [...contents].sort((a, b) => a.order - b.order),
    [contents]
  );

  const [codeValues, setCodeValues] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const c of sorted) {
      if (c.content_type === "code_editor") {
        const d = c.content_data as { starter_code?: string };
        m[c.id] = d.starter_code ?? "";
      }
    }
    return m;
  });

  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    feedback: string | null;
  } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState<string | null>(null);
  const [submittingCode, setSubmittingCode] = useState<string | null>(null);
  const [completed, setCompleted] = useState(initialCompleted);
  const [marking, setMarking] = useState(false);

  const markComplete = useCallback(async () => {
    setMarking(true);
    try {
      const res = await fetch(`/api/v2/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_completed: true }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Khong cap nhat duoc");
        return;
      }
      setCompleted(true);
      toast.success("Da danh dau hoan thanh");
      router.refresh();
    } finally {
      setMarking(false);
    }
  }, [lessonId, router]);

  async function submitQuiz(contentId: string, contentData: Record<string, unknown>) {
    const questions = (contentData.questions as QuizQuestion[] | undefined) ?? [];
    const answers: Record<string, unknown> = {};
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qid = q.id ?? `q_${i}`;
      answers[qid] = quizAnswers[qid] ?? "";
    }
    setSubmittingQuiz(contentId);
    try {
      const res = await fetch(`/api/v2/lessons/${lessonId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_type: "quiz",
          answers,
          lesson_content_id: contentId,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        score?: number;
        feedback?: string | null;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Khong nop duoc");
        return;
      }
      setQuizResult({
        score: j.score ?? 0,
        feedback: j.feedback ?? null,
      });
      toast.success(`Diem: ${j.score ?? 0}`);
    } finally {
      setSubmittingQuiz(null);
    }
  }

  async function submitCode(contentId: string) {
    const code = codeValues[contentId] ?? "";
    setSubmittingCode(contentId);
    try {
      const res = await fetch(`/api/v2/lessons/${lessonId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_type: "code",
          submitted_code: code,
          lesson_content_id: contentId,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Khong nop duoc");
        return;
      }
      toast.success("Da nop code");
    } finally {
      setSubmittingCode(null);
    }
  }

  if (!enrolled) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Ban can ghi danh khoa hoc de xem bai.
          <div className="mt-4">
            <Link
              href={`/student/courses/${courseId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Chi tiet khoa hoc
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      {sorted.map((c) => {
        const d = c.content_data;
        if (c.content_type === "video") {
          const url = normalizeVideoEmbedUrl(String((d as { url?: string }).url ?? ""));
          const title = String((d as { title?: string }).title ?? "Video");
          return (
            <section key={c.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {url ? (
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
                  <iframe
                    title={title}
                    src={url}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Chua co URL video.</p>
              )}
            </section>
          );
        }
        if (c.content_type === "text") {
          const body = String((d as { body?: string }).body ?? "");
          const title = String((d as { title?: string }).title ?? "Noi dung");
          return (
            <section key={c.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {body ? (
                <LessonMarkdown content={body} />
              ) : (
                <p className="text-muted-foreground text-sm">Trong.</p>
              )}
            </section>
          );
        }
        if (c.content_type === "code_editor") {
          const title = String((d as { title?: string }).title ?? "Code");
          const language = String((d as { language?: string }).language ?? "python");
          return (
            <section key={c.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <LazyMonacoEditor
                height="min(360px, 50vh)"
                language={language === "python" ? "python" : language}
                theme="vs-dark"
                value={codeValues[c.id] ?? ""}
                onChange={(v) =>
                  setCodeValues((s) => ({ ...s, [c.id]: v ?? "" }))
                }
              />
              <Button
                type="button"
                onClick={() => void submitCode(c.id)}
                disabled={submittingCode === c.id}
              >
                {submittingCode === c.id ? "Dang nop…" : "Nop code"}
              </Button>
            </section>
          );
        }
        if (c.content_type === "quiz") {
          const title = String((d as { title?: string }).title ?? "Quiz");
          const questions = ((d as { questions?: QuizQuestion[] }).questions ??
            []) as QuizQuestion[];
          return (
            <section key={c.id} className="space-y-4 rounded-xl border border-border p-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <ul className="space-y-4">
                {questions.map((q, qi) => {
                  const qid = q.id ?? `q_${qi}`;
                  return (
                    <li key={qid} className="space-y-2">
                      <p className="text-sm font-medium">{q.question}</p>
                      {q.options?.length ? (
                        <select
                          className={cn(
                            "flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                          )}
                          value={quizAnswers[qid] ?? ""}
                          onChange={(e) =>
                            setQuizAnswers((s) => ({
                              ...s,
                              [qid]: e.target.value,
                            }))
                          }
                        >
                          <option value="">--</option>
                          {q.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Label className="text-xs">
                          Tra loi (true/false hoac text)
                          <input
                            className="mt-1 flex h-10 w-full max-w-md rounded-md border border-input px-3"
                            value={quizAnswers[qid] ?? ""}
                            onChange={(e) =>
                              setQuizAnswers((s) => ({
                                ...s,
                                [qid]: e.target.value,
                              }))
                            }
                          />
                        </Label>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                onClick={() => void submitQuiz(c.id, d as Record<string, unknown>)}
                disabled={submittingQuiz === c.id}
              >
                {submittingQuiz === c.id ? "Dang nop…" : "Nop quiz"}
              </Button>
              {quizResult ? (
                <p className="text-sm text-muted-foreground">
                  Ket qua: {quizResult.score}% — {quizResult.feedback}
                </p>
              ) : null}
            </section>
          );
        }
        if (c.content_type === "resource") {
          const title = String((d as { title?: string }).title ?? "Tai lieu");
          const fileUrl = String((d as { file_url?: string }).file_url ?? "");
          return (
            <section key={c.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm underline"
                >
                  Mo tai lieu
                </a>
              ) : (
                <p className="text-muted-foreground text-sm">Chua co lien ket.</p>
              )}
            </section>
          );
        }
        return null;
      })}

      <div className="border-t border-border pt-6">
        {completed ? (
          <p className="text-sm font-medium text-emerald-600">Bai da hoan thanh</p>
        ) : (
          <Button type="button" disabled={marking} onClick={() => void markComplete()}>
            {marking ? "Dang luu…" : "Danh dau hoan thanh bai"}
          </Button>
        )}
        <p className="text-muted-foreground mt-4 text-xs">{courseTitle}</p>
        <p className="text-muted-foreground text-xs">{lessonTitle}</p>
      </div>
    </div>
  );
}
