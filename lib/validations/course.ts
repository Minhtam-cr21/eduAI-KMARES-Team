import { z } from "zod";

const optionalUrlField = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.union([z.string().url(), z.null()]).optional()
);

const optionalText = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().nullable().optional()
);

const stringArray = z
  .array(z.string())
  .optional()
  .nullable()
  .transform((a) => (Array.isArray(a) && a.length === 0 ? null : a));

export const courseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullish(),
  content: z.string().nullish().optional(),
  course_type: z.enum(["skill", "role"]),
  category: z.string().min(1),
  category_id: z.string().uuid().optional().nullable(),
  thumbnail_url: optionalUrlField,
  image_url: optionalUrlField,
  promo_video_url: optionalUrlField,
  price: z.coerce.number().min(0).optional().nullable(),
  duration_hours: z.coerce.number().int().min(0).optional().nullable(),
  level: z
    .enum(["beginner", "intermediate", "advanced", "all_levels"])
    .optional()
    .nullable(),
  objectives: stringArray,
  target_audience: optionalText,
  recommendations: optionalText,
  what_you_will_learn: stringArray,
  requirements: stringArray,
  faq: z.unknown().optional().nullable(),
  highlights: stringArray,
  outcomes_after: stringArray,
});

export type CourseBody = z.infer<typeof courseSchema>;

export const updateCourseSchema = courseSchema.partial().extend({
  is_published: z.boolean().optional(),
});

export type UpdateCourseBody = z.infer<typeof updateCourseSchema>;
