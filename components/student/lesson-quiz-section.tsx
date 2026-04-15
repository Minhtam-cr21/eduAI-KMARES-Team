"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ClipboardList, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type QuizPublicQuestion = { question: string; options: string[] };

type QuizPublic = {
  id: string;
  title: string;
  description: string | null;
  questions: QuizPublicQuestion[];
  time_limit: number | null;
  passing_score: number | null;
};

type DetailRow = {
  index: number;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
};

export function LessonQuizSection({
  courseId,
  lessonId,
  enrolled,
}: {
  courseId: string;
  lessonId: string;
  enrolled: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [mode, setMode] = useState<"idle" | "taking" | "done">("idle");
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    passing_score: number;
    details: DetailRow[];
  } | null>(null);

  const load = useCallback(async () => {
    if (!enrolled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`);
      const j = (await res.json()) as { quiz?: QuizPublic | null };
      if (!res.ok) {
        setQuiz(null);
        return;
      }
      setQuiz(j.quiz ?? null);
      if (j.quiz?.questions?.length) {
        setAnswers(new Array(j.quiz.questions.length).fill(""));
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, enrolled]);

  useEffect(() => {
    void load();
  }, [load]);

  function startQuiz() {
    if (!quiz?.questions.length) return;
    setAnswers(new Array(quiz.questions.length).fill(""));
    setResult(null);
    setMode("taking");
  }

  async function submit() {
    if (!quiz) return;
    for (let i = 0; i < quiz.questions.length; i++) {
      if (!answers[i]) {
        toast.error("Please answer question " + (i + 1));
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/lessons/${lessonId}/quiz/attempt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, quiz_id: quiz.id }),
        }
      );
      const j = (await res.json()) as {
        error?: string;
        score?: number;
        passed?: boolean;
        passing_score?: number;
        details?: DetailRow[];
      };
      if (!res.ok) {
        toast.error(j.error ?? "Submit failed");
        return;
      }
      setResult({
        score: j.score ?? 0,
        passed: j.passed === true,
        passing_score: j.passing_score ?? 70,
        details: j.details ?? [],
      });
      setMode("done");
      toast.success("Score: " + j.score + "%");
    } finally {
      setSubmitting(false);
    }
  }

  if (!enrolled || loading) {
    return null;
  }

  if (!quiz) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex flex-wrap items-center gap-3">
        <ClipboardList className="text-primary h-5 w-5" />
        <h2 className="text-lg font-semibold text-foreground">{quiz.title}</h2>
      </div>
      {quiz.description ? (
        <p className="text-muted-foreground mt-2 text-sm">{quiz.description}</p>
      ) : null}
      {quiz.time_limit != null ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Suggested time: {quiz.time_limit} min - Pass at {quiz.passing_score ?? 70}%
        </p>
      ) : null}

      {mode === "idle" ? (
        <Button type="button" className="mt-4" onClick={startQuiz}>
          Take quiz
        </Button>
      ) : null}

      {mode === "taking" ? (
        <div className="mt-6 space-y-6">
          {quiz.questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="font-medium text-foreground">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm",
                      answers[qi] === opt && "border-primary bg-primary/5"
                    )}
                  >
                    <input
                      type="radio"
                      name={"q-" + qi}
                      className="text-primary"
                      checked={answers[qi] === opt}
                      onChange={() =>
                        setAnswers((prev) => {
                          const n = [...prev];
                          n[qi] = opt;
                          return n;
                        })
                      }
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Grading...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "done" && result ? (
        <div className="mt-6 space-y-4">
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              result.passed
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
                : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            )}
          >
            <p className="font-semibold">
              Score: {result.score}% (need {result.passing_score}% to pass)
            </p>
            <p className="mt-1">
              {result.passed
                ? "You passed."
                : "Not passed yet — review explanations below."}
            </p>
          </div>
          <div className="space-y-4">
            <Label className="text-base font-semibold">Review</Label>
            {result.details.map((d) => (
              <div
                key={d.index}
                className={cn(
                  "rounded-md border p-3 text-sm",
                  d.correct
                    ? "border-green-200/80 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                <p className="font-medium">
                  Q{d.index + 1}: {d.correct ? "Correct" : "Wrong"}
                </p>
                <p className="text-muted-foreground mt-1">
                  Your answer: <span className="text-foreground">{d.userAnswer || "—"}</span>
                </p>
                {!d.correct ? (
                  <p className="mt-1">
                    Correct:{" "}
                    <span className="font-medium text-foreground">{d.correctAnswer}</span>
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-xs">{d.explanation}</p>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={startQuiz}>
            Retry
          </Button>
        </div>
      ) : null}
    </section>
  );
}
