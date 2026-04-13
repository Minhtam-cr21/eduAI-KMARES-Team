import type { AssessmentQuestion } from "./questions";
import { ASSESSMENT_QUESTIONS } from "./questions";

export function isQuestionAnswered(
  q: AssessmentQuestion,
  merged: Record<string, string>
): boolean {
  const v = merged[q.code]?.trim() ?? "";
  if (!v) return false;
  if (q.type === "checkbox") {
    return v.split(",").some((s) => s.trim().length > 0);
  }
  return true;
}

export function countAnsweredQuestions(
  merged: Record<string, string>
): number {
  return ASSESSMENT_QUESTIONS.filter((q) => isQuestionAnswered(q, merged))
    .length;
}
