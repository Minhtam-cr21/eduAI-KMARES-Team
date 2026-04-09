"use client";

import type { OnboardingQuestion } from "@/lib/onboarding/questions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type BasicInfo = {
  full_name: string;
  birth_year: number;
  school?: string;
  class?: string;
};

function groupLabel(group: OnboardingQuestion["group"]): string {
  switch (group) {
    case "A":
      return "Mục tiêu & thói quen";
    case "B":
      return "Phong cách học";
    case "C":
      return "Nền tảng & kỹ năng";
    case "D":
      return "Sở thích (tùy chọn)";
    case "MBTI":
      return "MBTI";
    default:
      return "";
  }
}

function toggleCheckbox(
  selected: string[],
  value: string,
  exclusiveNone: boolean
): string[] {
  if (exclusiveNone && value === "none") {
    return selected.includes("none") ? [] : ["none"];
  }
  const base = selected.filter((v) => v !== "none");
  if (base.includes(value)) {
    return base.filter((v) => v !== value);
  }
  return [...base, value];
}

function QuestionBlock({
  q,
  value,
  checkboxValues,
  onRadio,
  onCheckbox,
}: {
  q: OnboardingQuestion;
  value: string;
  checkboxValues: string[];
  onRadio: (code: string, v: string) => void;
  onCheckbox: (code: string, values: string[]) => void;
}) {
  if (q.type === "checkbox" && q.options) {
    return (
      <div className="space-y-3">
        <Label className="text-base font-medium leading-snug">
          {q.text}
          {q.required ? (
            <span className="text-destructive"> *</span>
          ) : null}
        </Label>
        <div className="flex flex-col gap-2">
          {q.options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <Checkbox
                checked={checkboxValues.includes(opt.value)}
                onCheckedChange={() => {
                  const next = toggleCheckbox(
                    checkboxValues,
                    opt.value,
                    opt.value === "none"
                  );
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
      <div className="space-y-3">
        <Label className="text-base font-medium leading-snug">
          {q.text}
          {q.required ? (
            <span className="text-destructive"> *</span>
          ) : null}
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
    <div className="space-y-2">
      <Label htmlFor={q.code}>{q.text}</Label>
      <Input
        id={q.code}
        value={value}
        onChange={(e) => onRadio(q.code, e.target.value)}
        placeholder="Trả lời…"
      />
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [questions, setQuestions] = useState<OnboardingQuestion[] | null>(
    null
  );
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [basic, setBasic] = useState<BasicInfo>({
    full_name: "",
    birth_year: 2010,
    school: "",
    class: "",
  });

  const [radioAnswers, setRadioAnswers] = useState<Record<string, string>>({});
  const [checkboxAnswers, setCheckboxAnswers] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [qRes, pRes] = await Promise.all([
          fetch("/api/onboarding/questions"),
          fetch("/api/user/profile"),
        ]);
        const qs = (await qRes.json()) as OnboardingQuestion[];
        const pJson = (await pRes.json()) as {
          profile?: {
            onboarding_completed?: boolean | null;
            full_name?: string | null;
            birth_year?: number | null;
            school?: string | null;
            class?: string | null;
          };
        };
        if (!cancelled && qRes.ok && Array.isArray(qs)) {
          setQuestions(qs);
        } else if (!cancelled) {
          toast.error("Không tải được câu hỏi onboarding.");
        }
        if (
          pRes.ok &&
          pJson.profile?.onboarding_completed === true &&
          !cancelled
        ) {
          router.replace("/student");
          return;
        }
        if (pJson.profile) {
          setBasic((b) => ({
            ...b,
            full_name: pJson.profile?.full_name?.trim() ?? "",
            birth_year:
              typeof pJson.profile?.birth_year === "number"
                ? pJson.profile.birth_year
                : b.birth_year,
            school: pJson.profile?.school ?? "",
            class: pJson.profile?.class ?? "",
          }));
        }
      } catch {
        toast.error("Không tải được dữ liệu.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const abcQuestions = useMemo(
    () =>
      (questions ?? []).filter((q) =>
        ["A", "B", "C"].includes(q.group ?? "")
      ),
    [questions]
  );
  const mbtiQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.group === "MBTI"),
    [questions]
  );
  const dQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.group === "D"),
    [questions]
  );

  const requiredCodes = useMemo(
    () => (questions ?? []).filter((q) => q.required).map((q) => q.code),
    [questions]
  );

  function setRadio(code: string, v: string) {
    setRadioAnswers((prev) => ({ ...prev, [code]: v }));
  }

  function setCheckbox(code: string, values: string[]) {
    setCheckboxAnswers((prev) => ({ ...prev, [code]: values }));
  }

  function validateStep(target: number): boolean {
    if (target <= 1) {
      if (!basic.full_name.trim()) {
        toast.error("Nhập họ tên.");
        return false;
      }
      if (basic.birth_year < 1970 || basic.birth_year > 2015) {
        toast.error("Năm sinh trong khoảng 1970–2015.");
        return false;
      }
      return true;
    }
    if (target === 2) {
      for (const q of abcQuestions) {
        if (!q.required) continue;
        if (q.type === "checkbox") {
          const arr = checkboxAnswers[q.code] ?? [];
          if (arr.length === 0) {
            toast.error(`Chọn ít nhất một đáp án: ${q.code}`);
            return false;
          }
        } else if (!radioAnswers[q.code]) {
          toast.error(`Chưa trả lời: ${q.code}`);
          return false;
        }
      }
      return true;
    }
    if (target === 3) {
      for (const q of mbtiQuestions) {
        if (!radioAnswers[q.code]) {
          toast.error(`Chưa trả lời MBTI: ${q.code}`);
          return false;
        }
      }
      return true;
    }
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function buildPayload(skipD: boolean): {
    basicInfo: BasicInfo;
    answers: { code: string; answer: string }[];
  } {
    const answers: { code: string; answer: string }[] = [];
    for (const q of questions ?? []) {
      if (skipD && q.group === "D") continue;
      if (q.type === "checkbox") {
        const arr = checkboxAnswers[q.code] ?? [];
        if (!q.required && arr.length === 0) continue;
        answers.push({ code: q.code, answer: JSON.stringify(arr) });
        continue;
      }
      const r = radioAnswers[q.code];
      if (!q.required && !r) continue;
      if (r) answers.push({ code: q.code, answer: r });
    }
    return {
      basicInfo: {
        full_name: basic.full_name.trim(),
        birth_year: basic.birth_year,
        school: basic.school?.trim() || undefined,
        class: basic.class?.trim() || undefined,
      },
      answers,
    };
  }

  function goToMbtiFromAbc() {
    if (!validateStep(2)) return;
    setStep(3);
  }

  function goToOptionalD() {
    if (!validateStep(3)) return;
    setStep(4);
  }

  async function completeOnboarding(skipD: boolean) {
    if (!questions) return;
    if (!validateStep(3)) return;

    const missing: string[] = [];
    for (const code of requiredCodes) {
      const q = questions.find((x) => x.code === code);
      if (!q) continue;
      if (skipD && q.group === "D") continue;
      if (q.type === "checkbox") {
        if ((checkboxAnswers[code] ?? []).length === 0) missing.push(code);
      } else if (!radioAnswers[code]) {
        missing.push(code);
      }
    }
    if (missing.length) {
      toast.error(`Thiếu câu bắt buộc: ${missing.join(", ")}`);
      return;
    }

    const { basicInfo, answers } = buildPayload(skipD);

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basicInfo, answers }),
      });
      const j = (await res.json()) as {
        error?: string;
        sync_errors?: string[];
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không gửi được onboarding.");
        return;
      }
      if (j.sync_errors?.length) {
        toast.message("Onboarding đã lưu; một số khóa chưa đồng bộ lộ trình.", {
          description: j.sync_errors.slice(0, 3).join(" · "),
        });
      } else {
        toast.success("Hoàn tất onboarding!");
      }
      router.replace("/student");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProfile || !questions) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground text-center text-sm">Đang tải…</p>
      </main>
    );
  }

  const stepTitles = [
    "Thông tin cơ bản",
    "Câu hỏi cá nhân hóa (A–C)",
    "10 câu MBTI",
    "Sở thích (tùy chọn)",
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <p className="text-muted-foreground text-xs font-medium">
            Bước {step} / 4 — {stepTitles[step - 1]}
          </p>
          <CardTitle className="text-xl">Onboarding EduAI</CardTitle>
          <CardDescription>
            30 câu (20 cá nhân hóa + 10 MBTI). Bạn có thể bỏ qua nhóm D.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ và tên *</Label>
                <Input
                  id="full_name"
                  value={basic.full_name}
                  onChange={(e) =>
                    setBasic((b) => ({ ...b, full_name: e.target.value }))
                  }
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_year">Năm sinh *</Label>
                <Input
                  id="birth_year"
                  type="number"
                  min={1970}
                  max={2015}
                  value={basic.birth_year}
                  onChange={(e) =>
                    setBasic((b) => ({
                      ...b,
                      birth_year: Number(e.target.value) || b.birth_year,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">Trường</Label>
                <Input
                  id="school"
                  value={basic.school}
                  onChange={(e) =>
                    setBasic((b) => ({ ...b, school: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Lớp</Label>
                <Input
                  id="class"
                  value={basic.class}
                  onChange={(e) =>
                    setBasic((b) => ({ ...b, class: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10">
              {(["A", "B", "C"] as const).map((g) => {
                const qs = abcQuestions.filter((q) => q.group === g);
                if (!qs.length) return null;
                return (
                  <section key={g} className="space-y-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {groupLabel(g)}
                    </h3>
                    {qs.map((q) => (
                      <QuestionBlock
                        key={q.code}
                        q={q}
                        value={radioAnswers[q.code] ?? ""}
                        checkboxValues={checkboxAnswers[q.code] ?? []}
                        onRadio={setRadio}
                        onCheckbox={setCheckbox}
                      />
                    ))}
                  </section>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {groupLabel("MBTI")}
              </h3>
              {mbtiQuestions.map((q) => (
                <QuestionBlock
                  key={q.code}
                  q={q}
                  value={radioAnswers[q.code] ?? ""}
                  checkboxValues={[]}
                  onRadio={setRadio}
                  onCheckbox={setCheckbox}
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {groupLabel("D")}
              </h3>
              {dQuestions.map((q) => (
                <QuestionBlock
                  key={q.code}
                  q={q}
                  value={radioAnswers[q.code] ?? ""}
                  checkboxValues={checkboxAnswers[q.code] ?? []}
                  onRadio={setRadio}
                  onCheckbox={setCheckbox}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={back}
                disabled={submitting}
              >
                Quay lại
              </Button>
            )}
            {step === 1 && (
              <Button type="button" onClick={next} disabled={submitting}>
                Tiếp tục
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                onClick={goToMbtiFromAbc}
                disabled={submitting}
              >
                Tiếp — câu MBTI
              </Button>
            )}
            {step === 3 && (
              <>
                <Button
                  type="button"
                  onClick={goToOptionalD}
                  disabled={submitting}
                >
                  Tiếp — nhóm D (tùy chọn)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void completeOnboarding(true)}
                  disabled={submitting}
                >
                  {submitting ? "Đang gửi…" : "Hoàn tất (bỏ qua nhóm D)"}
                </Button>
              </>
            )}
            {step === 4 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void completeOnboarding(true)}
                  disabled={submitting}
                >
                  Bỏ qua nhóm D
                </Button>
                <Button
                  type="button"
                  onClick={() => void completeOnboarding(false)}
                  disabled={submitting}
                >
                  {submitting ? "Đang gửi…" : "Hoàn tất"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
