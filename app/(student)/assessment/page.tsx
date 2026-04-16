"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssessmentQuestion } from "@/lib/assessment/questions";
import {
  ASSESSMENT_QUESTIONS_BY_GROUP,
  ASSESSMENT_QUESTION_COUNTS,
  groupAssessmentQuestions,
} from "@/lib/assessment/questions";
import {
  countAnsweredQuestions,
  isQuestionAnswered,
} from "@/lib/assessment/question-utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const LS_KEY = "assessment_answers_temp";

type TabKey = keyof typeof ASSESSMENT_QUESTIONS_BY_GROUP;

const TAB_ORDER: TabKey[] = ["MBTI", "A", "B", "C", "D"];

const TAB_BASE_LABEL: Record<TabKey, string> = {
  MBTI: "MBTI",
  A: "Mục tiêu",
  B: "Phong cách học",
  C: "Nền tảng",
  D: "Sở thích",
};

function RadioQuestionGroup({
  q,
  value,
  onChange,
}: {
  q: AssessmentQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!q.options) return null;
  return (
    <fieldset className="space-y-3 rounded-lg border border-border bg-card p-4">
      <legend className="text-base font-medium leading-snug text-foreground">
        {q.text}
        {q.required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </legend>
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label={q.text}
      >
        {q.options.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <input
                type="radio"
                name={q.code}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CheckboxQuestionGroup({
  q,
  values,
  onCheckbox,
}: {
  q: AssessmentQuestion;
  values: string[];
  onCheckbox: (next: string[]) => void;
}) {
  if (!q.options) return null;
  return (
    <fieldset className="space-y-3 rounded-lg border border-border bg-card p-4">
      <legend className="text-base font-medium leading-snug text-foreground">
        {q.text}
        {q.required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-1 py-1 text-sm hover:bg-muted/40"
          >
            <Checkbox
              checked={values.includes(opt.value)}
              onCheckedChange={(checked) => {
                let next = values.filter((x) => x !== opt.value);
                if (checked === true) {
                  if (opt.value === "none") {
                    next = ["none"];
                  } else {
                    next = next.filter((x) => x !== "none");
                    next.push(opt.value);
                  }
                }
                onCheckbox(next);
              }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function QuestionBlock({
  q,
  value,
  checkboxValues,
  onRadio,
  onCheckbox,
}: {
  q: AssessmentQuestion;
  value: string;
  checkboxValues: string[];
  onRadio: (code: string, v: string) => void;
  onCheckbox: (code: string, next: string[]) => void;
}) {
  if (q.type === "checkbox" && q.options) {
    return (
      <CheckboxQuestionGroup
        q={q}
        values={checkboxValues}
        onCheckbox={(next) => onCheckbox(q.code, next)}
      />
    );
  }

  if ((q.type === "radio" || q.type === "mbti") && q.options) {
    return (
      <RadioQuestionGroup
        q={q}
        value={value}
        onChange={(v) => onRadio(q.code, v)}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Label htmlFor={q.code}>{q.text}</Label>
      <input
        id={q.code}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onRadio(q.code, e.target.value)}
      />
    </div>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<AssessmentQuestion[] | null>(null);
  const [radioAnswers, setRadioAnswers] = useState<Record<string, string>>({});
  const [checkboxAnswers, setCheckboxAnswers] = useState<
    Record<string, string[]>
  >({});
  const [persistReady, setPersistReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/assessment/questions");
        if (!res.ok) {
          toast.error("Không tải được câu hỏi");
          return;
        }
        const qs = (await res.json()) as AssessmentQuestion[];
        if (!cancelled) setQuestions(qs);
      } catch (e) {
        toast.error("Lỗi mạng", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!questions?.length) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as {
          radio?: Record<string, string>;
          checkbox?: Record<string, string[]>;
        };
        if (p.radio && typeof p.radio === "object") {
          setRadioAnswers(p.radio);
        }
        if (p.checkbox && typeof p.checkbox === "object") {
          setCheckboxAnswers(p.checkbox);
        }
      }
    } catch {
      /* ignore */
    }
    setPersistReady(true);
  }, [questions]);

  useEffect(() => {
    if (!persistReady) return;
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ radio: radioAnswers, checkbox: checkboxAnswers })
      );
    } catch {
      /* ignore */
    }
  }, [radioAnswers, checkboxAnswers, persistReady]);

  const onRadio = useCallback((code: string, v: string) => {
    setRadioAnswers((prev) => ({ ...prev, [code]: v }));
  }, []);

  const onCheckbox = useCallback((code: string, next: string[]) => {
    setCheckboxAnswers((prev) => ({ ...prev, [code]: next }));
  }, []);

  const mergedAnswers = useMemo(() => {
    const out: Record<string, string> = { ...radioAnswers };
    for (const [code, arr] of Object.entries(checkboxAnswers)) {
      out[code] = [...arr].sort().join(",");
    }
    return out;
  }, [radioAnswers, checkboxAnswers]);

  const groupedQuestions = useMemo(
    () => (questions?.length ? groupAssessmentQuestions(questions) : ASSESSMENT_QUESTIONS_BY_GROUP),
    [questions]
  );

  const totalQuestions = questions?.length ?? ASSESSMENT_QUESTION_COUNTS.total;

  const answeredCount = useMemo(
    () => countAnsweredQuestions(mergedAnswers),
    [mergedAnswers]
  );
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const canSubmit = answeredCount >= totalQuestions && !submitting;

  const tabLabels = useMemo(() => {
    const map = new Map<TabKey, { answered: number; total: number }>();
    for (const key of TAB_ORDER) {
      const list = groupedQuestions[key];
      const answered = list.filter((q) =>
        isQuestionAnswered(q, mergedAnswers)
      ).length;
      map.set(key, { answered, total: list.length });
    }
    return map;
  }, [groupedQuestions, mergedAnswers]);

  async function handleSubmit() {
    if (!questions?.length || !canSubmit) return;
    setSubmitting(true);
    try {
      const answers = questions.map((q) => ({
        questionCode: q.code,
        answer: mergedAnswers[q.code] ?? "",
      }));
      const res = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Không lưu được bài test", {
          description: data.error ?? res.statusText,
        });
        return;
      }
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        /* ignore */
      }
      toast.success("Đã hoàn thành trắc nghiệm định hướng");
      router.push("/assessment/result");
      router.refresh();
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground text-sm">Đang tải câu hỏi…</p>
      </main>
    );
  }

  if (!questions?.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-destructive text-sm">Không có dữ liệu câu hỏi.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <div className="mb-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Trắc nghiệm định hướng
          </h1>
          <p className="text-muted-foreground text-sm">
            {ASSESSMENT_QUESTION_COUNTS.total} câu (
            {ASSESSMENT_QUESTION_COUNTS.mbti} MBTI +{" "}
            {ASSESSMENT_QUESTION_COUNTS.extended} mở rộng). Tiến độ được lưu tạm
            trên trình duyệt của bạn.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ</span>
            <span className="font-medium tabular-nums text-foreground">
              {answeredCount}/{totalQuestions} ({progressPct}%)
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      </div>

      <Tabs defaultValue="MBTI" className="w-full">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1">
          {TAB_ORDER.map((key) => {
            const { answered, total } = tabLabels.get(key)!;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="text-xs sm:text-sm"
              >
                {TAB_BASE_LABEL[key]} ({answered}/{total})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_ORDER.map((key) => (
          <TabsContent key={key} value={key} className="space-y-4">
            {groupedQuestions[key].map((q) => (
              <QuestionBlock
                key={q.code}
                q={q}
                value={
                  q.type === "checkbox"
                    ? ""
                    : mergedAnswers[q.code] ?? radioAnswers[q.code] ?? ""
                }
                checkboxValues={checkboxAnswers[q.code] ?? []}
                onRadio={onRadio}
                onCheckbox={onCheckbox}
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl justify-end">
          <span
            title={
              canSubmit
                ? undefined
                : "Vui lòng trả lời tất cả câu hỏi"
            }
            className="inline-block"
          >
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Đang gửi…" : "Gửi bài test"}
            </Button>
          </span>
        </div>
      </div>
    </main>
  );
}
