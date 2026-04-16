import { z } from "zod";

export const personalizedPathSignalSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
  })
  .strict();

export const personalizedPathSequenceItemSchema = z
  .object({
    course_id: z.string().uuid(),
    title: z.string(),
    order_index: z.number().int().min(0),
    recommended_due_date_offset_days: z.number().int().min(1),
  })
  .strict();

export const pathSuggestionAnalysisSourceSchema = z.enum([
  "structured_profile",
  "structured_profile_with_ai",
  "raw_answers_fallback",
]);

export const personalizedPathSuggestionSchema = z
  .object({
    courseSequence: z.array(personalizedPathSequenceItemSchema),
    reasoning: z.string(),
    learnerSignalsUsed: z.array(personalizedPathSignalSchema),
    analysisSource: pathSuggestionAnalysisSourceSchema,
  })
  .strict();

export type PersonalizedPathSignal = z.infer<typeof personalizedPathSignalSchema>;
export type PersonalizedPathSequenceItem = z.infer<
  typeof personalizedPathSequenceItemSchema
>;
export type PathSuggestionAnalysisSource = z.infer<
  typeof pathSuggestionAnalysisSourceSchema
>;
export type PersonalizedPathSuggestion = z.infer<
  typeof personalizedPathSuggestionSchema
>;
