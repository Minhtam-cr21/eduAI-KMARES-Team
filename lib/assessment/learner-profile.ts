import {
  ASSESSMENT_VERSION,
  type AssessmentTraitScores,
  type LearnerAnalysis,
  type LearnerProfile,
} from "./contracts";
import {
  getAssessmentOptionLabel,
  splitAssessmentAnswer,
} from "./questions";
import { computeMBTI, computeTraits } from "./analyzer";

type MbtiAxis = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

const MBTI_PAIRS: Array<{
  key: "EI" | "SN" | "TF" | "JP";
  primary: MbtiAxis;
  secondary: MbtiAxis;
  codes: string[];
}> = [
  { key: "EI", primary: "E", secondary: "I", codes: ["MBTI_1", "MBTI_2", "MBTI_11", "MBTI_12"] },
  { key: "SN", primary: "S", secondary: "N", codes: ["MBTI_3", "MBTI_4", "MBTI_13", "MBTI_14"] },
  { key: "TF", primary: "T", secondary: "F", codes: ["MBTI_5", "MBTI_6", "MBTI_15", "MBTI_16"] },
  {
    key: "JP",
    primary: "J",
    secondary: "P",
    codes: ["MBTI_7", "MBTI_8", "MBTI_9", "MBTI_10", "MBTI_17", "MBTI_18", "MBTI_19", "MBTI_20"],
  },
];

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function labelOrValue(code: string, value: string | undefined): string | null {
  if (!value) return null;
  return getAssessmentOptionLabel(code, value) ?? value;
}

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function scoreToPacing(traits: AssessmentTraitScores): LearnerAnalysis["recommended_pacing"] {
  if (traits.foundationSkills >= 75 && traits.motivation >= 75) return "accelerated";
  if (traits.foundationSkills <= 45 || traits.motivation <= 45) return "slow";
  return "steady";
}

export function computeMbtiDimensions(answers: Record<string, string>) {
  const dimensions: LearnerProfile["mbti_dimensions"] = {
    EI: {
      primary: "E",
      secondary: "I",
      counts: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
      confidence: 0,
    },
    SN: {
      primary: "S",
      secondary: "N",
      counts: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
      confidence: 0,
    },
    TF: {
      primary: "T",
      secondary: "F",
      counts: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
      confidence: 0,
    },
    JP: {
      primary: "J",
      secondary: "P",
      counts: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
      confidence: 0,
    },
  };

  for (const pair of MBTI_PAIRS) {
    let primaryCount = 0;
    let secondaryCount = 0;
    for (const code of pair.codes) {
      const raw = answers[code]?.trim();
      if (!raw) continue;
      if (raw === pair.primary) primaryCount += 1;
      if (raw === pair.secondary) secondaryCount += 1;
    }
    const total = primaryCount + secondaryCount;
    const primary = primaryCount >= secondaryCount ? pair.primary : pair.secondary;
    const secondary = primary === pair.primary ? pair.secondary : pair.primary;
    const dominant = Math.max(primaryCount, secondaryCount);
    const runnerUp = Math.min(primaryCount, secondaryCount);
    const counts: Record<MbtiAxis, number> = {
      E: 0,
      I: 0,
      S: 0,
      N: 0,
      T: 0,
      F: 0,
      J: 0,
      P: 0,
    };
    counts[pair.primary] = primaryCount;
    counts[pair.secondary] = secondaryCount;

    const nextDimension = {
      primary,
      secondary,
      counts,
      confidence: total === 0 ? 0 : clamp((Math.abs(dominant - runnerUp) / total) * 100),
    };

    if (pair.key === "EI") dimensions.EI = nextDimension;
    if (pair.key === "SN") dimensions.SN = nextDimension;
    if (pair.key === "TF") dimensions.TF = nextDimension;
    if (pair.key === "JP") dimensions.JP = nextDimension;
  }

  return dimensions;
}

export function buildLearnerProfile(answers: Record<string, string>): LearnerProfile {
  const mbti_type = computeMBTI(answers);
  const trait_scores = computeTraits(answers);
  const mbti_dimensions = computeMbtiDimensions(answers);

  const goalPrimary = labelOrValue("A1", answers.A1) ?? "Chưa xác định rõ mục tiêu học";
  const goalContext = labelOrValue("A5", answers.A5);
  const studyTime = labelOrValue("A3", answers.A3);
  const urgency = labelOrValue("A6", answers.A6);
  const preferredFormat = labelOrValue("B1", answers.B1);
  const supportStyle = labelOrValue("B2", answers.B2);
  const studyWindow = labelOrValue("B7", answers.B7);
  const englishLevel = labelOrValue("C3", answers.C3);
  const databaseLevel = labelOrValue("C6", answers.C6);
  const selfLearning = labelOrValue("B3", answers.B3);

  const interests = uniq([
    labelOrValue("D1", answers.D1),
    ...splitAssessmentAnswer(answers.D2 ?? "").map((value) => getAssessmentOptionLabel("D2", value) ?? value),
    labelOrValue("D3", answers.D3),
    labelOrValue("D5", answers.D5),
    labelOrValue("D6", answers.D6),
    labelOrValue("D8", answers.D8),
  ]);

  const learning_style_signals = uniq([
    preferredFormat ? `Ưa hình thức học: ${preferredFormat}` : null,
    supportStyle ? `Hay xử lý khó khăn bằng: ${supportStyle}` : null,
    selfLearning ? `Mức tự học hiện tại: ${selfLearning}` : null,
    trait_scores.learningStyle >= 70 ? "Tiếp nhận tốt nhiều hình thức học nếu có ví dụ rõ" : null,
    trait_scores.learningStyle < 50 ? "Cần thiết kế bài học có nhịp chậm và nhắc lại nhiều hơn" : null,
    labelOrValue("B8", answers.B8)
      ? `Thiên về ${labelOrValue("B8", answers.B8)?.toLowerCase()} khi học`
      : null,
  ]);

  const motivation_signals = uniq([
    goalPrimary ? `Mục tiêu nổi bật: ${goalPrimary}` : null,
    goalContext ? `Bối cảnh mong muốn: ${goalContext}` : null,
    urgency ? `Mức cấp thiết hiện tại: ${urgency}` : null,
    trait_scores.motivation >= 75 ? "Động lực học tập khá rõ và có định hướng" : null,
    trait_scores.motivation < 50 ? "Động lực học tập còn dễ dao động, cần milestone ngắn" : null,
  ]);

  const risk_flags = uniq([
    trait_scores.foundationSkills < 45 ? "Nền tảng kỹ thuật còn mỏng" : null,
    trait_scores.motivation < 45 ? "Động lực học tập chưa ổn định" : null,
    answers.C1?.includes("none") ? "Thiếu trải nghiệm công cụ kỹ thuật cơ bản" : null,
    answers.C3 === "bad" || answers.C3 === "dictionary" ? "Tiếng Anh kỹ thuật còn hạn chế" : null,
    answers.B4 === "very_hard" ? "Dễ nản khi gặp nội dung khó" : null,
    answers.B5 === "alone" ? "Ít xu hướng tìm hỗ trợ khi gặp khó khăn" : null,
    answers.A3 === "<1" ? "Quỹ thời gian học mỗi ngày khá thấp" : null,
  ]);

  const goal_summary = [goalPrimary, goalContext ? `định hướng gần với ${goalContext.toLowerCase()}` : null]
    .filter(Boolean)
    .join(", ");

  const constraint_summary = uniq([
    studyTime ? `Thời gian học mỗi ngày: ${studyTime}` : null,
    studyWindow ? `Khung giờ học thuận lợi: ${studyWindow}` : null,
    englishLevel ? `Tiếng Anh kỹ thuật: ${englishLevel}` : null,
    databaseLevel ? `SQL/CSDL: ${databaseLevel}` : null,
    urgency ? `Áp lực mục tiêu: ${urgency}` : null,
  ]).join(" | ");

  return {
    assessment_version: ASSESSMENT_VERSION,
    mbti_type,
    mbti_dimensions,
    trait_scores,
    learning_style_signals,
    motivation_signals,
    goal_summary: goal_summary || "Chưa đủ dữ liệu để tóm tắt mục tiêu.",
    constraint_summary:
      constraint_summary || "Chưa ghi nhận ràng buộc học tập nổi bật từ bộ câu hỏi hiện tại.",
    interests,
    risk_flags,
  };
}

export function buildFallbackLearnerAnalysis(
  profile: LearnerProfile
): LearnerAnalysis {
  const support_strategies = uniq([
    profile.trait_scores.foundationSkills < 50
      ? "Bắt đầu bằng lộ trình chậm, nhiều ví dụ và bài tập nền tảng."
      : "Có thể đi theo chuỗi bài học với nhiều bài tập áp dụng.",
    profile.trait_scores.learningStyle >= 70
      ? "Kết hợp ví dụ trực quan, bài tập thực hành và checkpoint ngắn."
      : "Chia nhỏ nội dung, nhắc lại khái niệm chính và có checklist rõ ràng.",
    profile.trait_scores.motivation < 50
      ? "Dùng milestone ngắn và phản hồi thường xuyên để giữ nhịp học."
      : "Có thể giao mục tiêu theo tuần với mức tự chủ cao hơn.",
  ]).slice(0, 6);

  const motivation_hooks = uniq([
    profile.goal_summary,
    ...profile.interests.slice(0, 3).map((interest) => `Gắn ví dụ với chủ đề ${interest.toLowerCase()}.`),
  ]).slice(0, 6);

  const risk_explanation = profile.risk_flags.length
    ? profile.risk_flags.map((flag) => `Cần lưu ý: ${flag.toLowerCase()}.`).slice(0, 6)
    : ["Chưa thấy cờ rủi ro lớn từ scoring deterministic hiện tại."];

  const path_focus = uniq([
    profile.goal_summary,
    ...profile.interests.slice(0, 3),
    profile.trait_scores.foundationSkills < 50 ? "củng cố nền tảng kỹ thuật" : "tăng tốc dự án ứng dụng",
  ]).slice(0, 6);

  return {
    assessment_version: ASSESSMENT_VERSION,
    learner_summary: `Hồ sơ ${profile.mbti_type} với mục tiêu ${profile.goal_summary.toLowerCase()}. Trọng tâm hiện tại là cân bằng giữa nền tảng kỹ thuật, động lực học và sở thích đã thể hiện trong bài assessment.`,
    recommended_pacing: scoreToPacing(profile.trait_scores),
    support_strategies,
    motivation_hooks,
    risk_explanation,
    path_focus,
    communication_style:
      profile.mbti_dimensions.EI.primary === "E"
        ? "Ưu tiên phản hồi trực diện, nhiều tương tác và checkpoint ngắn."
        : "Ưu tiên hướng dẫn rõ ràng, có thời gian tự suy nghĩ và tài liệu tham khảo kèm theo.",
  };
}
