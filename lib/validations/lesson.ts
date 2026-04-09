import { GOAL_SLUGS } from "@/lib/goals";
import { z } from "zod";

const goalSlugSchema = z.enum(GOAL_SLUGS);

const stringish = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : String(v)));

/** Chuỗi rỗng → undefined; còn lại phải là URL hợp lệ (http/https). */
const optionalHttpUrl = z.preprocess((val) => {
  if (val == null) return undefined;
  const s = String(val).trim();
  if (s === "") return undefined;
  return s;
}, z.string().url("URL phải hợp lệ (http/https)").optional());

export const lessonFormSchema = z.object({
  title: stringish.pipe(z.string().trim().min(1, "Nhập tiêu đề bài học")),
  content: stringish,
  video_url: optionalHttpUrl,
  order_index: z.coerce.number().int("Thứ tự phải là số nguyên"),
  is_published: z.boolean(),
  goals: z.array(goalSlugSchema).default([]),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;

export const lessonUpdateSchema = lessonFormSchema.extend({
  id: z.string().uuid("ID bài học không hợp lệ"),
});

export type LessonUpdateValues = z.infer<typeof lessonUpdateSchema>;

/** Body POST /api/admin/lessons */
export const createLessonApiSchema = lessonFormSchema.extend({
  topic_id: z.string().uuid("topic_id không hợp lệ"),
});

export type CreateLessonApiBody = z.infer<typeof createLessonApiSchema>;
