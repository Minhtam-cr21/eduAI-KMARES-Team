import { z } from "zod";

import { learnerAnalysisSchema } from "@/lib/assessment/contracts";

export const scheduleCourseRefSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
  })
  .strict();

export const scheduleLessonRefSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    course_id: z.string().uuid(),
    course: scheduleCourseRefSchema.nullable(),
  })
  .strict();

export const schedulePrioritySchema = z.enum([
  "critical",
  "high",
  "normal",
  "light",
]);

export const softDeadlineLevelSchema = z.enum([
  "level_1",
  "level_2",
  "level_3",
  "level_4",
]);

export const scheduleRiskLevelSchema = z.enum(["low", "medium", "high"]);

export const scheduleAdjustmentProposalSchema = z
  .object({
    item_id: z.string().uuid(),
    priority: schedulePrioritySchema,
    soft_deadline_level: softDeadlineLevelSchema,
    proposed_due_date: z.string().nullable(),
    proposal_reason: z.string().min(1),
    suggested_action: z.string().min(1),
  })
  .strict();

export const teacherScheduleRecommendationSchema = z
  .object({
    recommendation_type: z.enum([
      "keep_pace",
      "reduce_load",
      "change_priority",
      "needs_intervention",
    ]),
    priority: schedulePrioritySchema,
    rationale: z.string().min(1),
    recommended_action: z.string().min(1),
    target_item_ids: z.array(z.string().uuid()).max(12),
  })
  .strict();

export const weeklyLearningAnalysisSchema = z
  .object({
    week_start: z.string().min(1),
    week_end: z.string().min(1),
    total_items: z.number().int().nonnegative(),
    pending_items: z.number().int().nonnegative(),
    completed_items: z.number().int().nonnegative(),
    overdue_items: z.number().int().nonnegative(),
    slip_count: z.number().int().nonnegative(),
    risk_level: scheduleRiskLevelSchema,
    high_load_detected: z.boolean(),
    imbalance_detected: z.boolean(),
  })
  .strict();

export const enrichedScheduleItemSchema = z
  .object({
    id: z.string().uuid(),
    due_date: z.string().nullable(),
    status: z.string(),
    miss_count: z.number().int().nullable(),
    completed_at: z.string().nullable(),
    path_id: z.string().uuid().nullable(),
    lesson_id: z.string().uuid().nullable(),
    lesson: scheduleLessonRefSchema.nullable(),
    priority: schedulePrioritySchema,
    soft_deadline_level: softDeadlineLevelSchema.nullable(),
    priority_score: z.number().int().nonnegative(),
    adjustment_proposal: scheduleAdjustmentProposalSchema.nullable(),
  })
  .strict();

export const scheduleSummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    frozen: z.number().int().nonnegative(),
    estimated_hours_total: z.number().nullable(),
    estimated_hours_pending: z.number().nullable(),
  })
  .strict();

export const scheduleLoadBucketSchema = z
  .object({
    week_start: z.string().min(1),
    week_end: z.string().min(1),
    total_items: z.number().int().nonnegative(),
    pending_items: z.number().int().nonnegative(),
    completed_items: z.number().int().nonnegative(),
    overdue_items: z.number().int().nonnegative(),
  })
  .strict();

export const scheduleAnalysisSnapshotSchema = z
  .object({
    analysis_source: z.literal("rule_based"),
    engine_version: z.literal("smart_schedule_v2"),
    as_of_date: z.string().min(1),
    weekly_load: z.array(scheduleLoadBucketSchema),
    weekly_analysis: z.array(weeklyLearningAnalysisSchema).max(8),
    total_slip_count: z.number().int().nonnegative(),
    high_load_detected: z.boolean(),
    imbalance_detected: z.boolean(),
    recommended_pacing: learnerAnalysisSchema.shape.recommended_pacing,
    recommendations: z.array(z.string().min(1)).max(8),
    teacher_recommendations: z.array(teacherScheduleRecommendationSchema).max(8),
    adjustment_proposals: z.array(scheduleAdjustmentProposalSchema).max(12),
  })
  .strict();

export const scheduleSnapshotResponseSchema = z
  .object({
    items: z.array(enrichedScheduleItemSchema),
    summary: scheduleSummarySchema,
    analysis: scheduleAnalysisSnapshotSchema,
  })
  .strict();

export type EnrichedScheduleItem = z.infer<typeof enrichedScheduleItemSchema>;
export type SchedulePriority = z.infer<typeof schedulePrioritySchema>;
export type SoftDeadlineLevel = z.infer<typeof softDeadlineLevelSchema>;
export type ScheduleRiskLevel = z.infer<typeof scheduleRiskLevelSchema>;
export type ScheduleSummary = z.infer<typeof scheduleSummarySchema>;
export type ScheduleLoadBucket = z.infer<typeof scheduleLoadBucketSchema>;
export type WeeklyLearningAnalysis = z.infer<
  typeof weeklyLearningAnalysisSchema
>;
export type ScheduleAnalysisSnapshot = z.infer<
  typeof scheduleAnalysisSnapshotSchema
>;
export type TeacherScheduleRecommendation = z.infer<
  typeof teacherScheduleRecommendationSchema
>;
export type ScheduleAdjustmentProposal = z.infer<
  typeof scheduleAdjustmentProposalSchema
>;
