import { z } from "zod";

/** Chuỗi rỗng → null trước khi kiểm tra URL (form thường gửi ""). */
const thumbnailUrlField = z.preprocess(
  (val) => (val === "" ? null : val),
  z.string().url().optional().nullable()
);

export const courseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullish(),
  course_type: z.enum(["skill", "role"]),
  category: z.string().min(1),
  thumbnail_url: thumbnailUrlField,
});

export type CourseBody = z.infer<typeof courseSchema>;

/** PUT — chỉ validate field được gửi. */
export const updateCourseSchema = courseSchema.partial();

export type UpdateCourseBody = z.infer<typeof updateCourseSchema>;
