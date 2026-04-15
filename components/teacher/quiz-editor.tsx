"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type QuizQuestionForm = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type QuizApiShape = {
  id?: string;
  title: string;
  description: string | null;
  questions: QuizQuestionForm[];
  time_limit: number | null;
  passing_score: number | null;
  is_published: boolean | null;
};

function emptyQuestion(): QuizQuestionForm {
  return {
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
  };
}

function normalizeFromApi(q: unknown): QuizQuestionForm[] {
  if (!Array.isArray(q)) return [emptyQuestion()];
  return q.map((raw) => {
    const o = raw as Record<string, unknown>;
    const opts = Array.isArray(o.options) ? o.options.map((x) => String(x)) : ["", "", "", ""];
    while (opts.length < 4) opts.push("");
    return {
      question: String(o.question ?? ""),
      options: opts.slice(0, 8),
      correctAnswer: String(o.correctAnswer ?? ""),
      explanation: String(o.explanation ?? ""),
    };
  });
}

export function QuizEditorDialog({
  open,
  onOpenChange,
  courseId,
  lessonId,
  lessonTitle,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("20");
  const [passingScore, setPassingScore] = useState("70");
  const [published, setPublished] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestionForm[]>([emptyQuestion()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`);
      const j = (await res.json()) as { quiz?: QuizApiShape | null; error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải được quiz");
        return;
      }
      if (j.quiz) {
        setTitle(j.quiz.title);
        setDescription(j.quiz.description ?? "");
        setTimeLimit(j.quiz.time_limit != null ? String(j.quiz.time_limit) : "20");
        setPassingScore(
          j.quiz.passing_score != null ? String(j.quiz.passing_score) : "70"
        );
        setPublished(j.quiz.is_published !== false);
        const nq = normalizeFromApi(j.quiz.questions);
        setQuestions(nq.length ? nq : [emptyQuestion()]);
      } else {
        setTitle(`Quiz: ${lessonTitle}`);
        setDescription(`Ki\u1EC3m tra ki\u1EBFn th\u1EE9c b\u00E0i ${lessonTitle}`);
        setTimeLimit("20");
        setPassingScore("70");
        setPublished(true);
        setQuestions([emptyQuestion()]);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, lessonTitle]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function updateQuestion(i: number, patch: Partial<QuizQuestionForm>) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    );
  }

  function updateOption(qIndex: number, optIndex: number, val: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const options = [...q.options];
        options[optIndex] = val;
        return { ...q, options };
      })
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function save() {
    const tl = Math.min(180, Math.max(1, parseInt(timeLimit, 10) || 20));
    const ps = Math.min(100, Math.max(0, parseInt(passingScore, 10) || 70));
    const cleaned = questions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()).filter((o) => o.length > 0),
      correctAnswer: q.correctAnswer.trim(),
      explanation: q.explanation.trim(),
    }));
    for (const q of cleaned) {
      if (!q.question) {
        toast.error("M\u1ED7i c\u00E2u c\u1EA7n c\u00F3 n\u1ED9i dung c\u00E2u h\u1ECFi");
        return;
      }
      if (q.options.length < 2) {
        toast.error("M\u1ED7i c\u00E2u c\u1EA7n \u00EDt nh\u1EA5t 2 \u0111\u00E1p \u00E1n");
        return;
      }
      if (!q.options.includes(q.correctAnswer)) {
        toast.error("Đáp án đúng phải trùng một trong các lựa chọn");
        return;
      }
      if (!q.explanation) {
        toast.error("Th\u00EAm gi\u1EA3i th\u00EDch cho m\u1ED7i c\u00E2u");
        return;
      }
    }
    if (!title.trim()) {
      toast.error("Nhập tiêu đề quiz");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          questions: cleaned,
          time_limit: tl,
          passing_score: ps,
          is_published: published,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không lưu được");
        return;
      }
      toast.success("Đã lưu quiz");
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeQuiz() {
    if (!confirm("Xóa toàn bộ quiz của bài này?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không xóa được");
        return;
      }
      toast.success("Đã xóa quiz");
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>Quiz — {lessonTitle}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm">Đang tải…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qz-title">Tiêu đề</Label>
                <Input
                  id="qz-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qz-pass">Điểm đạt (%)</Label>
                <Input
                  id="qz-pass"
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="qz-desc">Mô tả</Label>
                <Textarea
                  id="qz-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qz-time">Th\u1EDDi gi\u1EDBi h\u1EA1n (ph\u00FAt)</Label>
                <Input
                  id="qz-time"
                  type="number"
                  min={1}
                  max={180}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="qz-pub"
                  checked={published}
                  onCheckedChange={(c) => setPublished(c === true)}
                />
                <Label htmlFor="qz-pub">Xu\u1EA5t b\u1EA3n (h\u1ECDc sinh xem \u0111\u01B0\u1EE3c)</Label>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <h3 className="text-sm font-semibold">C\u00E2u h\u1ECFi tr\u1EAFc nghi\u1EC7m</h3>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addQuestion}>
                <Plus className="h-3.5 w-3.5" />
                Thêm câu
              </Button>
            </div>

            <div className="space-y-6">
              {questions.map((q, qi) => (
                <div key={qi} className="bg-muted/40 space-y-3 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground text-xs font-medium">Câu {qi + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8 shrink-0"
                      onClick={() => removeQuestion(qi)}
                      disabled={questions.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label>C\u00E2u h\u1ECFi</Label>
                    <Textarea
                      rows={2}
                      value={q.question}
                      onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="space-y-1">
                        <Label className="text-xs">Đáp án {oi + 1}</Label>
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Lựa chọn ${oi + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Đáp án đúng (trùng nội dung một ô trên)</Label>
                    <Input
                      value={q.correctAnswer}
                      onChange={(e) => updateQuestion(qi, { correctAnswer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Giải thích</Label>
                    <Textarea
                      rows={2}
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => void removeQuiz()}
            disabled={saving || loading}
          >
            Xóa quiz
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {"\u0110\u00F3ng"}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || loading}>
              {saving ? "Đang lưu…" : "Lưu quiz"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
