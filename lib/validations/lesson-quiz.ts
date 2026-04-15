import { z } from "zod";

export const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(8),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

export const lessonQuizUpsertSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  questions: z.array(quizQuestionSchema).min(1).max(50),
  time_limit: z.number().int().min(1).max(180).optional().nullable(),
  passing_score: z.number().int().min(0).max(100).optional(),
  is_published: z.boolean().optional(),
});

export type LessonQuizUpsertInput = z.infer<typeof lessonQuizUpsertSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
