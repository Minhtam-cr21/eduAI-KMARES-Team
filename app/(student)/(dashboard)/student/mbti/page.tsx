"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Question = {
  id: number;
  text: string;
  options: { A: string; B: string };
  dimension: string;
};

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

  const answeredCount = Object.keys(answers).length;
  const canStart = !status?.last_test || status.can_retest === true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answeredCount !== 10) {
      toast.error("Trả lời đủ 10 câu.");
      return;
    }
    const payload = {
      answers: Array.from({ length: 10 }, (_, i) => {
        const questionId = i + 1;
        const answer = answers[questionId];
        return { questionId, answer: answer! };
      }),
    };
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/mbti/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground text-center text-sm">Đang tải…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">MBTI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {status?.last_test
              ? `Lần làm gần nhất: ${status.last_test}`
              : "Chưa có lần làm nào."}
          </p>
        </div>
        <Link
          href="/student"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Hub
        </Link>
      </div>

      {result ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="font-semibold">Kết quả: {result.mbti_type}</p>
          <p className="text-muted-foreground text-sm">{result.test_date}</p>
        </div>
      ) : null}

      {!canStart && status?.last_test ? (
        <p className="text-muted-foreground text-sm">
          Bạn có thể làm lại sau 2 tháng kể từ lần test trước.
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {questions.map((q) => (
            <fieldset
              key={q.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <legend className="text-sm font-medium">
                {q.id}. {q.text}
              </legend>
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    checked={answers[q.id] === "A"}
                    onChange={() =>
                      setAnswers((a) => ({ ...a, [q.id]: "A" }))
                    }
                  />
                  {q.options.A}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    checked={answers[q.id] === "B"}
                    onChange={() =>
                      setAnswers((a) => ({ ...a, [q.id]: "B" }))
                    }
                  />
                  {q.options.B}
                </label>
              </div>
            </fieldset>
          ))}
          <p className="text-muted-foreground text-sm">
            Đã trả lời: {answeredCount}/10
          </p>
          <button
            type="submit"
            disabled={submitting || answeredCount !== 10}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            {submitting ? "Đang gửi…" : "Nộp bài"}
          </button>
        </form>
      )}
    </main>
  );
}
