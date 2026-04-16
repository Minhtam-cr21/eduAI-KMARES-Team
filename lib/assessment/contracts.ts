import { z } from "zod";

export const ASSESSMENT_VERSION = "phase3_v1" as const;

const mbtiLetterSchema = z.enum(["E", "I", "S", "N", "T", "F", "J", "P"]);
const axisConfidenceSchema = z.number().int().min(0).max(100);

const mbtiAxisDimensionSchema = z
  .object({
    primary: mbtiLetterSchema,
    secondary: mbtiLetterSchema,
    counts: z.record(mbtiLetterSchema, z.number().int().nonnegative()),
    confidence: axisConfidenceSchema,
  })
  .strict();

export const assessmentTraitScoresSchema = z
  .object({
    motivation: z.number().int().min(0).max(100),
    learningStyle: z.number().int().min(0).max(100),
    foundationSkills: z.number().int().min(0).max(100),
    interests: z.number().int().min(0).max(100),
  })
  .strict();

export const learnerProfileSchema = z
  .object({
    assessment_version: z.literal(ASSESSMENT_VERSION),
    mbti_type: z
      .string()
      .regex(/^[EI][SN][TF][JP]$/),
    mbti_dimensions: z
      .object({
        EI: mbtiAxisDimensionSchema,
        SN: mbtiAxisDimensionSchema,
        TF: mbtiAxisDimensionSchema,
        JP: mbtiAxisDimensionSchema,
      })
      .strict(),
    trait_scores: assessmentTraitScoresSchema,
    learning_style_signals: z.array(z.string().min(1)).max(8),
    motivation_signals: z.array(z.string().min(1)).max(8),
    goal_summary: z.string().min(1),
    constraint_summary: z.string().min(1),
    interests: z.array(z.string().min(1)).max(10),
    risk_flags: z.array(z.string().min(1)).max(10),
  })
  .strict();

export const analysisSourceSchema = z.enum(["openai", "rule_based"]);

export const learnerAnalysisSchema = z
  .object({
    assessment_version: z.literal(ASSESSMENT_VERSION),
    learner_summary: z.string().min(1),
    recommended_pacing: z.enum(["slow", "steady", "accelerated"]),
    support_strategies: z.array(z.string().min(1)).min(2).max(6),
    motivation_hooks: z.array(z.string().min(1)).min(1).max(6),
    risk_explanation: z.array(z.string().min(1)).max(6),
    path_focus: z.array(z.string().min(1)).min(1).max(6),
    communication_style: z.string().min(1),
  })
  .strict();

export type AssessmentTraitScores = z.infer<typeof assessmentTraitScoresSchema>;
export type LearnerProfile = z.infer<typeof learnerProfileSchema>;
export type LearnerAnalysis = z.infer<typeof learnerAnalysisSchema>;
export type AnalysisSource = z.infer<typeof analysisSourceSchema>;
