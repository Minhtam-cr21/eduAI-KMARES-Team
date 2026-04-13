"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssessmentQuestion } from "@/lib/assessment/questions";
import { ASSESSMENT_QUESTIONS_BY_GROUP } from "@/lib/assessment/questions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Label className="text-base font-medium leading-snug">
          {q.text}
          {q.required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-1 py-1 text-sm hover:bg-muted/40"
            >
              <Checkbox
                checked={checkboxValues.includes(opt.value)}
                onCheckedChange={(checked) => {
                  let next = checkboxValues.filter((x) => x !== opt.value);
                  if (checked === true) {
                    if (opt.value === "none") {
                      next = ["none"];
                    } else {
                      next = next.filter((x) => x !== "none");
                      next.push(opt.value);
                    }
                  }
                  onCheckbox(q.code, next);
                }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if ((q.type === "radio" || q.type === "mbti") && q.options) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Label className="text-base font-medium leading-snug">
          {q.text}
          {q.required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRadio(q.code, opt.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                value === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
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

const TAB_META: { key: keyof typeof ASSESSMENT_QUESTIONS_BY_GROUP; label: string }[] =
  [
    { key: "MBTI", label: "MBTI (20)" },
    { key: "A", label: "Mục tiêu (6)" },
    { key: "B", label: "Phong cách học (8)" },
    { key: "C", label: "Nền tảng (8)" },
    { key: "D", label: "Sở thích (8)" },
  ];

export default function AssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<AssessmentQuestion[] | null>(null);
  const [radioAnswers, setRadioAnswers] = useState<Record<string, string>>({});
  const [checkboxAnswers, setCheckboxAnswers] = useState<
    Record<string, string[]>
  >({});
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

  async function handleSubmit() {
    if (!questions?.length) return;
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
      const data = (await res.json()) as { error?: string; mbti_type?: string };
      if (!res.ok) {
        toast.error("Không lưu được bài test", {
          description: data.error ?? res.statusText,
        });
        return;
      }
      toast.success("Đã hoàn thành trắc nghiệm định hướng", {
        description: data.mbti_type
          ? `MBTI (ước lượng): ${data.mbti_type}`
          : undefined,
      });
      router.push("/student");
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
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Trắc nghiệm định hướng
        </h1>
        <p className="text-muted-foreground text-sm">
          50 câu (20 MBTI + 30 mở rộng). Trả lời theo từng phần, sau đó gửi bài.
        </p>
      </div>

      <Tabs defaultValue="MBTI" className="w-full">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_META.map((t) => (
          <TabsContent key={t.key} value={t.key} className="space-y-4">
            {ASSESSMENT_QUESTIONS_BY_GROUP[t.key].map((q) => (
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
        <div className="mx-auto flex max-w-3xl justify-end gap-3">
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Đang gửi…" : "Gửi bài test"}
          </Button>
        </div>
      </div>
    </main>
  );
}
