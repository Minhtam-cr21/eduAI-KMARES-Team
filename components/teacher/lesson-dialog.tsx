"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuizQuestionForm } from "@/components/teacher/quiz-editor";
import { Plus, Trash2 } from "lucide-react";

export type { QuizQuestionForm };

export function emptyQuizQuestion(): QuizQuestionForm {
  return {
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
  };
}

/** Chuẩn hóa câu hỏi trước khi gửi API (bỏ đáp án trống, giữ ít nhất 2 lựa chọn nếu có). */
export function normalizeQuizQuestionsForApi(rows: QuizQuestionForm[]): QuizQuestionForm[] {
  return rows
    .map((raw) => {
      const opts = (raw.options ?? []).map((x) => String(x).trim()).filter(Boolean);
      const correct = String(raw.correctAnswer ?? "").trim();
      return {
        question: String(raw.question ?? "").trim(),
        options: opts.length >= 2 ? opts : ["A", "B"],
        correctAnswer: correct,
        explanation: String(raw.explanation ?? "").trim(),
      };
    })
    .filter((q) => q.question.length > 0);
}

export function validateQuizQuestionsForCreate(rows: QuizQuestionForm[]): string | null {
  const normalized = normalizeQuizQuestionsForApi(rows);
  if (normalized.length === 0) {
    return "Thêm ít nhất một câu hỏi có nội dung.";
  }
  for (let i = 0; i < normalized.length; i++) {
    const q = normalized[i];
    if (!q.options.includes(q.correctAnswer)) {
      return `Câu ${i + 1}: đáp án đúng phải trùng với một trong các lựa chọn.`;
    }
  }
  return null;
}

export function TeacherLessonQuizFields({
  questions,
  onChange,
}: {
  questions: QuizQuestionForm[];
  onChange: (next: QuizQuestionForm[]) => void;
}) {
  function updateQuestion(i: number, patch: Partial<QuizQuestionForm>) {
    onChange(
      questions.map((q, j) => (j === i ? { ...q, ...patch } : q))
    );
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    const q = questions[qIndex];
    if (!q) return;
    const opts = [...q.options];
    opts[optIndex] = value;
    updateQuestion(qIndex, { options: opts });
  }

  function addQuestion() {
    onChange([...questions, emptyQuizQuestion()]);
  }

  function removeQuestion(i: number) {
    onChange(questions.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-4 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-base">Câu hỏi trắc nghiệm</Label>
        <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={addQuestion}>
          <Plus className="h-3.5 w-3.5" />
          Thêm câu
        </Button>
      </div>
      {questions.map((q, qi) => (
        <div key={qi} className="bg-muted/40 space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">Câu {qi + 1}</span>
            {questions.length > 1 ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive h-7 w-7"
                onClick={() => removeQuestion(qi)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nội dung câu hỏi</Label>
            <Textarea
              rows={2}
              value={q.question}
              onChange={(e) => updateQuestion(qi, { question: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <Checkbox
                  id={`quiz-${qi}-opt-${oi}`}
                  checked={q.correctAnswer === opt && opt.trim() !== ""}
                  onCheckedChange={(checked) => {
                    if (checked === true && opt.trim() !== "") {
                      updateQuestion(qi, { correctAnswer: opt });
                    }
                  }}
                />
                <Input
                  id={`quiz-${qi}-opt-${oi}`}
                  className="h-8 text-sm"
                  placeholder={`Đáp án ${oi + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-[11px]">
            Đánh dấu ô để chọn đáp án đúng (ô chỉ bật khi ô input có nội dung).
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Giải thích (tuỳ chọn)</Label>
            <Textarea
              rows={2}
              className="text-sm"
              value={q.explanation}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
