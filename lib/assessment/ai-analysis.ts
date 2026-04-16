import { getOpenAI, hasOpenAIApiKey } from "@/lib/ai/openai-client";

import {
  ASSESSMENT_VERSION,
  analysisSourceSchema,
  learnerAnalysisSchema,
  learnerProfileSchema,
  type AnalysisSource,
  type LearnerAnalysis,
  type LearnerProfile,
} from "./contracts";
import { buildFallbackLearnerAnalysis } from "./learner-profile";

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

type StructuredAssessmentAnalysis = {
  learner_profile: LearnerProfile;
  ai_analysis: LearnerAnalysis;
  analysis_source: AnalysisSource;
  assessment_version: typeof ASSESSMENT_VERSION;
};

export type AssessmentAiInput = {
  learner_profile: LearnerProfile;
};

export const assessmentAiInputSchema = learnerProfileSchema;

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return withoutFence.trim();
  }
  return trimmed;
}

function buildPrompt(input: AssessmentAiInput): string {
  return [
    "Bạn là chuyên gia phân tích hồ sơ người học cho EduAI.",
    "Nhiệm vụ: đọc learner_profile đã được chuẩn hóa sẵn và trả về duy nhất JSON hợp lệ, không markdown.",
    "Không được thay đổi mbti_type hoặc bịa thêm dữ liệu ngoài input.",
    "Phân tích phải thực tế, ngắn gọn, dùng được cho phase personalized path sau.",
    "JSON phải theo đúng schema đã mô tả trong system prompt.",
    "Dữ liệu đầu vào:",
    JSON.stringify(input.learner_profile),
  ].join("\n");
}

async function callOpenAiAssessmentAnalysis(
  input: AssessmentAiInput
): Promise<LearnerAnalysis | null> {
  if (!hasOpenAIApiKey()) return null;

  let content: string | undefined;
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: [
            "Bạn chỉ trả về JSON hợp lệ.",
            `Schema bắt buộc: ${JSON.stringify(
              {
                assessment_version: ASSESSMENT_VERSION,
                learner_summary: "string",
                recommended_pacing: "slow|steady|accelerated",
                support_strategies: ["string"],
                motivation_hooks: ["string"],
                risk_explanation: ["string"],
                path_focus: ["string"],
                communication_style: "string",
              },
              null,
              2
            )}`,
            "Mỗi field phải có giá trị rõ ràng, không để null, không thêm field ngoài schema.",
          ].join("\n"),
        },
        { role: "user", content: buildPrompt(input) },
      ],
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: "json_object" },
    });
    content = completion.choices?.[0]?.message?.content?.trim();
  } catch (error) {
    console.error(
      "[assessment-ai-analysis] OpenAI error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }

  if (!content) return null;

  try {
    const parsed = JSON.parse(extractJsonObject(content));
    const validated = learnerAnalysisSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

export async function buildStructuredAssessmentAnalysis(
  learnerProfile: LearnerProfile
): Promise<StructuredAssessmentAnalysis> {
  const validatedProfile = learnerProfileSchema.parse(learnerProfile);
  const openAiAnalysis = await callOpenAiAssessmentAnalysis({
    learner_profile: validatedProfile,
  });

  const ai_analysis = openAiAnalysis ?? buildFallbackLearnerAnalysis(validatedProfile);
  const analysis_source = analysisSourceSchema.parse(
    openAiAnalysis ? "openai" : "rule_based"
  );

  return {
    learner_profile: validatedProfile,
    ai_analysis,
    analysis_source,
    assessment_version: ASSESSMENT_VERSION,
  };
}
