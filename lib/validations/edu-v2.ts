import { z } from "zod";

export const eduLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const eduLessonTypeSchema = z.enum([
  "lecture",
  "interactive",
  "code-along",
  "quiz",
  "project",
]);
export const eduContentTypeSchema = z.enum([
  "video",
  "text",
  "code_editor",
  "quiz",
  "resource",
]);
export const eduSubmissionTypeSchema = z.enum(["quiz", "code", "assignment"]);
export const eduProgressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const eduCourseCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional().nullable(),
  language: z.string().max(16).optional().nullable(),
  level: eduLevelSchema.optional(),
  category: z.string().max(255).optional().nullable(),
  thumbnail_url: z.string().url().max(2000).optional().nullable(),
  duration_hours: z.coerce.number().int().min(0).max(10000).optional(),
  is_published: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const eduCourseUpdateSchema = eduCourseCreateSchema.partial();

export const eduModuleCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
  is_locked: z.boolean().optional(),
  duration_hours: z.coerce.number().int().min(0).max(10000).optional(),
});

export const eduModuleUpdateSchema = eduModuleCreateSchema.partial();

export const eduLessonCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
  lesson_type: eduLessonTypeSchema.optional(),
  duration_minutes: z.coerce.number().int().min(0).max(24 * 60).optional(),
  is_locked: z.boolean().optional(),
});

export const eduLessonUpdateSchema = eduLessonCreateSchema.partial();

export const eduContentCreateSchema = z.object({
  content_type: eduContentTypeSchema,
  order: z.coerce.number().int().min(0).optional(),
  content_data: z.record(z.string(), z.unknown()),
});

export const eduContentUpdateSchema = z.object({
  content_type: eduContentTypeSchema.optional(),
  order: z.coerce.number().int().min(0).optional(),
  content_data: z.record(z.string(), z.unknown()).optional(),
});

export const eduResourceCreateSchema = z.object({
  title: z.string().min(1).max(500),
  file_url: z.string().max(2000).optional().nullable(),
  file_type: z.string().max(64).optional().nullable(),
  file_size: z.coerce.number().int().min(0).optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
});

export const eduProgressUpsertSchema = z.object({
  status: eduProgressStatusSchema.optional(),
  completion_percentage: z.coerce.number().int().min(0).max(100).optional(),
  time_spent_minutes: z.coerce.number().int().min(0).optional(),
  mark_completed: z.boolean().optional(),
});

export const eduSubmissionCreateSchema = z.object({
  submission_type: eduSubmissionTypeSchema,
  submitted_code: z.string().max(500000).optional().nullable(),
  answers: z.record(z.string(), z.unknown()).optional().nullable(),
  lesson_content_id: z.string().uuid().optional(),
});
