import { z } from "zod";

export const exerciseLangSchema = z.enum(["python", "javascript", "cpp", "java"]);

/** Form + payload cơ sở (POST body không gồm lesson_id). */
export const exerciseFormSchema = z.object({
  title: z.string().min(1, "Nhập tiêu đề"),
  description: z.string().optional(),
  hint_logic: z.string().optional(),
  code_hint: z.string().optional(),
  initial_code: z.string().optional(),
  sample_input: z.string().optional(),
  sample_output: z.string().optional(),
  language: exerciseLangSchema.default("python"),
  order_index: z.coerce.number().int().default(0),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

/** POST /api/admin/exercises */
export const createExerciseApiSchema = exerciseFormSchema.extend({
  lesson_id: z.string().uuid("lesson_id không hợp lệ"),
});

export type CreateExerciseApiBody = z.infer<typeof createExerciseApiSchema>;

/** PUT /api/admin/exercises/[id] — mọi trường tuỳ chọn. */
export const updateExerciseApiSchema = exerciseFormSchema.partial();

export type UpdateExerciseApiBody = z.infer<typeof updateExerciseApiSchema>;
