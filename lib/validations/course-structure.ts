import { z } from "zod";

const lessonStruct = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  type: z.enum(["text", "video", "quiz"]),
  content: z.string().nullish(),
  video_url: z.string().nullish(),
  time_estimate: z.coerce.number().int().min(0).max(24 * 60).nullish(),
  is_free_preview: z.boolean().optional(),
  order_index: z.coerce.number().int().min(0),
});

const chapterStruct = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().nullish(),
  order_index: z.coerce.number().int().min(0),
  lessons: z.array(lessonStruct).default([]),
});

const benefitStruct = z.object({
  id: z.string().uuid().optional(),
  icon: z.string().nullish(),
  title: z.string().min(1).max(255),
  description: z.string().nullish(),
  display_order: z.coerce.number().int().min(0),
});

export const courseStructureSchema = z
  .object({
    chapters: z.array(chapterStruct).optional(),
    benefits: z.array(benefitStruct).optional(),
  })
  .refine((v) => v.chapters !== undefined || v.benefits !== undefined, {
    message: "Provide chapters and/or benefits",
  });

export type CourseStructureBody = z.infer<typeof courseStructureSchema>;
