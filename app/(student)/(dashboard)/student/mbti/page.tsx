"use client";

import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
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
        if (!cancelled) toast.error("Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c b\u00e0i test");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const built = buildPayload(answers);
    if (!built.ok) {
      toast.error("Tr\u1ea3 l\u1eddi \u0111\u1ee7 10 c\u00e2u (id 1\u201310).");
      return;
    }
    const payload = { answers: built.list };
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
        toast.error("Kh\u00f4ng n\u1ed9p \u0111\u01b0\u1ee3c", { description: data.error });
        return;
      }
      if (data.mbti_type && data.test_date) {
        setResult({ mbti_type: data.mbti_type, test_date: data.test_date });
      }
      const st = await fetch("/api/mbti/status");
      if (st.ok) {
        setStatus((await st.json()) as typeof status);
      }
      toast.success("\u0110\u00e3 l\u01b0u k\u1ebft qu\u1ea3 MBTI.");
    } catch (err) {
      toast.error("L\u1ed7i m\u1ea1ng", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground text-center text-sm">{"\u0110ang t\u1ea3i\u2026"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">MBTI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {status?.last_test
              ? `L\u1ea7n l\u00e0m g\u1ea7n nh\u1ea5t: ${status.last_test}`
              : "Ch\u01b0a c\u00f3 l\u1ea7n l\u00e0m n\u00e0o."}
          </p>
        </div>
        <Link
          href="/student"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          &larr; Hub
        </Link>
      </div>

      {result ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="font-semibold">{`K\u1ebft qu\u1ea3: ${result.mbti_type}`}</p>
          <p className="text-muted-foreground text-sm">{result.test_date}</p>
        </div>
      ) : null}

      {!canStart && status?.last_test ? (
        <p className="text-muted-foreground text-sm">
          {`B\u1ea1n c\u00f3 th\u1ec3 l\u00e0m l\u1ea1i sau 2 th\u00e1ng k\u1ec3 t\u1eeb l\u1ea7n test tr\u01b0\u1edbc.`}
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
            {`\u0110\u00e3 tr\u1ea3 l\u1eddi: ${answeredCount}/10`}
          </p>
          <button
            type="submit"
            disabled={submitting || !allAnswered}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            {submitting ? "\u0110ang g\u1eedi\u2026" : "N\u1ed9p b\u00e0i"}
          </button>
        </form>
      )}
    </main>
  );
}