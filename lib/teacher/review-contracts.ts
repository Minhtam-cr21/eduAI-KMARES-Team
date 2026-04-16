import { z } from "zod";

import {
  pathSuggestionAnalysisSourceSchema,
  personalizedPathSignalSchema,
} from "@/lib/personalized-path/contracts";
import {
  schedulePrioritySchema,
  scheduleAdjustmentProposalSchema,
  scheduleAnalysisSnapshotSchema,
  scheduleSummarySchema,
  softDeadlineLevelSchema,
  teacherScheduleRecommendationSchema,
  weeklyLearningAnalysisSchema,
} from "@/lib/study-schedule/contracts";

export const teacherReviewKindSchema = z.enum([
  "personalized_path",
  "schedule_insight",
]);

export const teacherPathReviewStatusSchema = z.enum([
  "reviewed",
  "adjusted",
  "sent_to_student",
  "monitoring",
]);

export const teacherScheduleReviewStatusSchema = z.enum([
  "monitoring",
  "needs_follow_up",
  "resolved",
]);

export const teacherRiskLevelSchema = z.enum(["low", "medium", "high"]);

export const teacherPathReviewSnapshotSchema = z
  .object({
    reasoning: z.string().min(1),
    suggestion_source: pathSuggestionAnalysisSourceSchema.nullable(),
    learner_signals_used: z.array(personalizedPathSignalSchema).max(8),
    path_status: z.string().nullable(),
    sequence_length: z.number().int().nonnegative(),
  })
  .strict();

export const teacherScheduleInsightSnapshotSchema = z
  .object({
    summary: scheduleSummarySchema,
    analysis_source: scheduleAnalysisSnapshotSchema.shape.analysis_source,
    engine_version: scheduleAnalysisSnapshotSchema.shape.engine_version,
    as_of_date: scheduleAnalysisSnapshotSchema.shape.as_of_date,
    recommendations: scheduleAnalysisSnapshotSchema.shape.recommendations,
    weekly_analysis: z.array(weeklyLearningAnalysisSchema).max(8),
    total_slip_count: scheduleAnalysisSnapshotSchema.shape.total_slip_count,
    high_load_detected: scheduleAnalysisSnapshotSchema.shape.high_load_detected,
    imbalance_detected: scheduleAnalysisSnapshotSchema.shape.imbalance_detected,
    teacher_recommendations: z.array(teacherScheduleRecommendationSchema).max(8),
    adjustment_proposals: z.array(scheduleAdjustmentProposalSchema).max(12),
  })
  .strict();

export const teacherPathReviewCreateSchema = z
  .object({
    pathId: z.string().uuid(),
    studentId: z.string().uuid(),
    reviewStatus: teacherPathReviewStatusSchema,
    reviewNote: z.string().trim().max(4000).optional().default(""),
    adjustmentNote: z.string().trim().max(4000).optional().default(""),
    suggestionSource: pathSuggestionAnalysisSourceSchema.nullish(),
    reasoning: z.string().trim().min(1).max(8000),
    learnerSignalsUsed: z.array(personalizedPathSignalSchema).max(8).default([]),
    pathStatus: z.string().nullable().optional(),
    sequenceLength: z.number().int().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (!value.reviewNote && !value.adjustmentNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cần ít nhất một review note hoặc adjustment note.",
        path: ["reviewNote"],
      });
    }
  });

export const teacherScheduleReviewCreateSchema = z
  .object({
    studentId: z.string().uuid(),
    reviewStatus: teacherScheduleReviewStatusSchema,
    riskLevel: teacherRiskLevelSchema,
    actionRecommendation: z.string().trim().max(4000).optional().default(""),
    reviewNote: z.string().trim().max(4000).optional().default(""),
    targetItemId: z.string().uuid().optional(),
    overridePriority: schedulePrioritySchema.optional(),
    overridePacing: z.enum(["slow", "steady", "accelerated"]).optional(),
    overrideLevel: softDeadlineLevelSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.actionRecommendation && !value.reviewNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cần ít nhất action recommendation hoặc review note.",
        path: ["reviewNote"],
      });
    }
  });

export const teacherReviewEventBaseSchema = z
  .object({
    id: z.string().uuid(),
    teacher_id: z.string().uuid(),
    student_id: z.string().uuid(),
    path_id: z.string().uuid().nullable(),
    review_kind: teacherReviewKindSchema,
    review_status: z.string().min(1),
    risk_level: teacherRiskLevelSchema.nullable(),
    source: z.string().min(1).nullable(),
    action_recommendation: z.string().min(1).nullable(),
    review_note: z.string().min(1).nullable(),
    adjustment_note: z.string().min(1).nullable(),
    snapshot: z.unknown(),
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const teacherPathReviewRecordSchema = teacherReviewEventBaseSchema
  .extend({
    review_kind: z.literal("personalized_path"),
    review_status: teacherPathReviewStatusSchema,
    snapshot: teacherPathReviewSnapshotSchema,
  })
  .strict();

export const teacherScheduleInsightReviewRecordSchema =
  teacherReviewEventBaseSchema
    .extend({
      review_kind: z.literal("schedule_insight"),
      review_status: teacherScheduleReviewStatusSchema,
      snapshot: teacherScheduleInsightSnapshotSchema,
    })
    .strict();

export type TeacherPathReviewStatus = z.infer<
  typeof teacherPathReviewStatusSchema
>;
export type TeacherScheduleReviewStatus = z.infer<
  typeof teacherScheduleReviewStatusSchema
>;
export type TeacherRiskLevel = z.infer<typeof teacherRiskLevelSchema>;
export type TeacherPathReviewCreate = z.infer<
  typeof teacherPathReviewCreateSchema
>;
export type TeacherScheduleReviewCreate = z.infer<
  typeof teacherScheduleReviewCreateSchema
>;
export type TeacherPathReviewRecord = z.infer<
  typeof teacherPathReviewRecordSchema
>;
export type TeacherScheduleInsightReviewRecord = z.infer<
  typeof teacherScheduleInsightReviewRecordSchema
>;
