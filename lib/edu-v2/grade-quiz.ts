/** Best-effort score for Edu V2 quiz content_data vs answers map (question id → answer). */

export function gradeEduQuizContent(
  contentData: Record<string, unknown>,
  answers: Record<string, unknown> | null | undefined
): { score: number; passingScore: number; passed: boolean } {
  const passingScore = Number(contentData.passing_score ?? 70);
  const questions = contentData.questions as
    | Array<{ id?: string; correct_answer?: unknown }>
    | undefined;

  if (!questions?.length || !answers) {
    return { score: 0, passingScore, passed: false };
  }

  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qid = q.id ?? `q_${i}`;
    const userAns = answers[qid];
    const expected = q.correct_answer;
    const ok =
      userAns === expected ||
      JSON.stringify(userAns) === JSON.stringify(expected);
    if (ok) correct++;
  }

  const score = Math.round((correct / questions.length) * 100);
  return {
    score,
    passingScore,
    passed: score >= passingScore,
  };
}
