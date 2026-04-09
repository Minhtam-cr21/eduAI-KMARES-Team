"use client";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Question = {
  id: number;
  text: string;
  options: { A: string; B: string };
  dimension: string;
};

const EXPECTED_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function buildPayload(answers: Record<number, "A" | "B">):
  | { ok: true; list: { questionId: number; answer: "A" | "B" }[] }
  | { ok: false } {
  const list: { questionId: number; answer: "A" | "B" }[] = [];
  for (const id of EXPECTED_IDS) {
    const a = answers[id];
    if (a !== "A" && a !== "B") return { ok: false };
    list.push({ questionId: id, answer: a });
  }
  return { ok: true, list };
}

function MbtiSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="mb-4 h-8 w-24" />
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-8 h-4 w-64" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}

export default function StudentMbtiPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<{
    can_retest: boolean;
    last_test: string | null;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<number, "A" | "B">>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    mbti_type: string;
    test_date: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          fetch("/api/mbti/questions"),
          fetch("/api/mbti/status"),
        ]);
        const q = qRes.ok ? ((await qRes.json()) as Question[]) : [];
        const s = sRes.ok
          ? ((await sRes.json()) as {
              can_retest: boolean;
              last_test: string | null;
            })
          : null;
        if (!cancelled) {
          setQuestions(Array.isArray(q) ? q : []);
          setStatus(s);
        }
      } catch {
        if (!cancelled) toast.error("Không tải được bài test");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const answeredCount = EXPECTED_IDS.filter(
    (id) => answers[id] === "A" || answers[id] === "B"
  ).length;
  const allAnswered = useMemo(() => buildPayload(answers).ok, [answers]);
  const canStart = !status?.last_test || status.can_retest === true;
  const progressPct = Math.round((answeredCount / 10) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const built = buildPayload(answers);
    if (!built.ok) {
      toast.error("Trả lời đủ 10 câu (id 1–10).");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/mbti/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: built.list }),
      });
      const data = (await res.json()) as {
        mbti_type?: string;
        test_date?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error("Không nộp được", { description: data.error });
        return;
      }
      if (data.mbti_type && data.test_date) {
        setResult({ mbti_type: data.mbti_type, test_date: data.test_date });
      }
      const st = await fetch("/api/mbti/status");
      if (st.ok) {
        setStatus((await st.json()) as typeof status);
      }
      toast.success("Đã lưu kết quả MBTI.");
    } catch (err) {
      toast.error("Lỗi mạng", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <MbtiSkeleton />;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bài test MBTI</h1>
            <p className="text-sm text-muted-foreground">
              {status?.last_test
                ? `Lần làm gần nhất: ${status.last_test}`
                : "Chưa có lần làm nào."}
            </p>
          </div>
        </div>
      </div>

      {result && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <CardTitle className="text-lg">Kết quả MBTI</CardTitle>
                <CardDescription>{result.test_date}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge className="bg-violet-600 px-4 py-1.5 text-lg font-bold text-white hover:bg-violet-700">
              {result.mbti_type}
            </Badge>
          </CardContent>
        </Card>
      )}

      {!canStart && status?.last_test ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <CardTitle className="text-base">Chưa đến hạn làm lại</CardTitle>
                <CardDescription>
                  Bạn có thể làm lại sau 2 tháng kể từ lần test trước.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Card className="mb-2">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Đã trả lời: <span className="font-semibold text-foreground">{answeredCount}</span>/10
                </span>
                <span className="font-medium text-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="mt-2 h-2" />
            </CardContent>
          </Card>

          {questions.map((q, idx) => (
            <Card key={q.id} className="transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Câu {idx + 1} / 10
                </CardTitle>
                <CardDescription className="text-base font-medium text-foreground">
                  {q.text}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                {(["A", "B"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [q.id]: opt }))
                    }
                    className={cn(
                      "flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition",
                      answers[q.id] === opt
                        ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-300"
                        : "border-border bg-card text-foreground hover:border-muted-foreground/30 hover:bg-muted/50"
                    )}
                  >
                    <span className="mr-2 font-bold">{opt}.</span>
                    {q.options[opt]}
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}

          <button
            type="submit"
            disabled={submitting || !allAnswered}
            className={cn(
              "w-full rounded-xl px-6 py-3 text-sm font-semibold transition sm:w-auto",
              allAnswered
                ? "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            {submitting ? "Đang gửi…" : "Nộp bài"}
          </button>
        </form>
      )}
    </main>
  );
}
