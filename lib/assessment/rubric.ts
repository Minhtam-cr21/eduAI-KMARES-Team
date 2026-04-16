import { z } from "zod";

import type {
  AssessmentTraitScores,
  LearnerAnalysis,
  LearnerProfile,
} from "./contracts";

export const assessmentBandSchema = z.enum(["Low", "Medium", "High"]);

export const assessmentRubricPillarSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    band: assessmentBandSchema,
    short_interpretation: z.string().min(1),
    path_implication: z.string().min(1),
    schedule_implication: z.string().min(1),
  })
  .strict();

export const assessmentRubricSchema = z
  .object({
    motivation: assessmentRubricPillarSchema,
    learning_style: assessmentRubricPillarSchema,
    foundation_skills: assessmentRubricPillarSchema,
    interest_alignment: assessmentRubricPillarSchema,
  })
  .strict();

export const studentAssessmentViewSchema = z
  .object({
    headline: z.string().min(1),
    summary: z.string().min(1),
    pacing_recommendation: z.string().min(1),
    strengths: z.array(z.string().min(1)).min(1).max(8),
    support_needs: z.array(z.string().min(1)).max(8),
    next_steps: z.array(z.string().min(1)).min(1).max(8),
  })
  .strict();

export const teacherAssessmentViewSchema = z
  .object({
    headline: z.string().min(1),
    summary: z.string().min(1),
    readiness_band: assessmentBandSchema,
    pacing_guidance: z.string().min(1),
    primary_risks: z.array(z.string().min(1)).max(8),
    support_strategies: z.array(z.string().min(1)).min(1).max(8),
    intervention_cues: z.array(z.string().min(1)).max(8),
  })
  .strict();

export type AssessmentBand = z.infer<typeof assessmentBandSchema>;
export type AssessmentRubricPillar = z.infer<
  typeof assessmentRubricPillarSchema
>;
export type AssessmentRubric = z.infer<typeof assessmentRubricSchema>;
export type StudentAssessmentView = z.infer<
  typeof studentAssessmentViewSchema
>;
export type TeacherAssessmentView = z.infer<
  typeof teacherAssessmentViewSchema
>;

function uniq(items: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
    )
  );
}

function scoreToBand(score: number): AssessmentBand {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function bandSummary(
  band: AssessmentBand,
  copy: {
    low: string;
    medium: string;
    high: string;
  }
): string {
  if (band === "High") return copy.high;
  if (band === "Medium") return copy.medium;
  return copy.low;
}

function buildMotivationPillar(
  profile: LearnerProfile
): AssessmentRubricPillar {
  const score = profile.trait_scores.motivation;
  const band = scoreToBand(score);
  return {
    score,
    band,
    short_interpretation: bandSummary(band, {
      low: "Động lực hiện còn dao động; cần mục tiêu ngắn và cảm giác tiến bộ rõ ràng.",
      medium:
        "Động lực đã hình thành nhưng vẫn cần checkpoint đều để giữ nhịp học.",
      high: "Động lực khá rõ và có thể duy trì tốt khi có mục tiêu tiến bộ cụ thể.",
    }),
    path_implication: bandSummary(band, {
      low: "Ưu tiên lộ trình ngắn hơn, mục tiêu gần và thắng lợi sớm trước khi tăng độ khó.",
      medium:
        "Giữ lộ trình có milestone rõ theo từng chặng, tránh chuỗi học quá dài không có phản hồi.",
      high: "Có thể giao chuỗi học tham vọng hơn và đưa dự án ứng dụng vào sớm hơn.",
    }),
    schedule_implication: bandSummary(band, {
      low: "Lịch nên nhẹ, có nhắc việc và nhịp kiểm tra tiến độ thường xuyên.",
      medium:
        "Lịch nên ổn định theo tuần với các checkpoint nhỏ để tránh hụt nhịp.",
      high: "Có thể giữ cadence đều và tăng dần khối lượng khi người học vẫn còn dư tải.",
    }),
  };
}

function buildLearningStylePillar(
  profile: LearnerProfile
): AssessmentRubricPillar {
  const score = profile.trait_scores.learningStyle;
  const band = scoreToBand(score);
  return {
    score,
    band,
    short_interpretation: bandSummary(band, {
      low: "Cần cách dạy rõ ràng hơn, chia nhỏ hơn và ít phụ thuộc vào tự xoay xở.",
      medium:
        "Học được với nhiều định dạng nếu có ví dụ và cấu trúc đủ rõ.",
      high: "Thích nghi tốt với nhiều hình thức học, đặc biệt khi có thực hành và ví dụ.",
    }),
    path_implication: bandSummary(band, {
      low: "Nội dung nên được sắp xếp tuyến tính, ít nhảy bước và có ví dụ mẫu đi kèm.",
      medium:
        "Có thể kết hợp lý thuyết ngắn, ví dụ và bài tập áp dụng trong cùng một chặng học.",
      high: "Có thể đưa thêm dạng học đa mô thức, tự khám phá và bài tập mở sớm hơn.",
    }),
    schedule_implication: bandSummary(band, {
      low: "Mỗi buổi học nên ngắn hơn, ít mục hơn và có mục tiêu đầu ra rất cụ thể.",
      medium:
        "Mỗi tuần nên có nhịp lặp lại hợp lý giữa đọc, xem và làm bài để giữ độ bám.",
      high: "Lịch có thể linh hoạt hơn giữa học lý thuyết, bài tập và mini project.",
    }),
  };
}

function buildFoundationSkillsPillar(
  profile: LearnerProfile
): AssessmentRubricPillar {
  const score = profile.trait_scores.foundationSkills;
  const band = scoreToBand(score);
  return {
    score,
    band,
    short_interpretation: bandSummary(band, {
      low: "Nền tảng kỹ thuật hiện còn mỏng; nên củng cố công cụ và khái niệm cốt lõi trước.",
      medium:
        "Đã có nền tảng cơ bản để tiến lên, nhưng vẫn cần ôn chắc trước các phần khó hơn.",
      high: "Nền tảng tương đối vững để nhận bài tập tích hợp và tiến nhanh hơn ở phần ứng dụng.",
    }),
    path_implication: bandSummary(band, {
      low: "Lộ trình nên mở đầu bằng các module nền tảng, giảm phần dự án nặng ở giai đoạn sớm.",
      medium:
        "Giữ cân bằng giữa củng cố kiến thức nền và bắt đầu bài tập ứng dụng có hướng dẫn.",
      high: "Có thể rút ngắn phần nền lặp lại và chuyển sớm sang bài tập ứng dụng hoặc project.",
    }),
    schedule_implication: bandSummary(band, {
      low: "Lịch nên chừa thêm thời gian luyện tập, sửa lỗi và ôn lại khái niệm nền.",
      medium:
        "Lịch nên xen kẽ buổi ôn nền với buổi làm bài ứng dụng để tránh hổng kiến thức.",
      high: "Có thể gom buổi học dài hơn hoặc cadence nhanh hơn nếu động lực vẫn ổn định.",
    }),
  };
}

function buildInterestAlignmentPillar(
  profile: LearnerProfile
): AssessmentRubricPillar {
  const score = profile.trait_scores.interests;
  const band = scoreToBand(score);
  return {
    score,
    band,
    short_interpretation: bandSummary(band, {
      low: "Tín hiệu sở thích còn phân tán; người học có thể cần thêm giai đoạn khám phá.",
      medium:
        "Đã có vài hướng quan tâm nổi bật nhưng vẫn nên giữ một chút độ mở để xác nhận lại.",
      high: "Sở thích và định hướng khá rõ, phù hợp để gắn lộ trình với các chủ đề ưu tiên.",
    }),
    path_implication: bandSummary(band, {
      low: "Nên giữ phần đầu lộ trình thiên về khám phá nhiều dạng nội dung trước khi chuyên sâu.",
      medium:
        "Có thể ưu tiên một vài chủ đề chính, nhưng chưa nên khóa cứng quá sớm vào một ngách duy nhất.",
      high: "Có thể thiết kế lộ trình bám sát domain quan tâm để tăng độ gắn kết và tính ứng dụng.",
    }),
    schedule_implication: bandSummary(band, {
      low: "Lịch nên đan xen các dạng bài và chủ đề để quan sát điều gì giữ được hứng thú tốt nhất.",
      medium:
        "Lịch nên giữ một trục chính nhưng có điểm chèn chủ đề phụ để xác nhận thêm độ phù hợp.",
      high: "Lịch có thể ưu tiên đều các buổi gắn với domain mục tiêu nhằm duy trì động lực.",
    }),
  };
}

export function buildAssessmentRubric(
  profile: LearnerProfile
): AssessmentRubric {
  return assessmentRubricSchema.parse({
    motivation: buildMotivationPillar(profile),
    learning_style: buildLearningStylePillar(profile),
    foundation_skills: buildFoundationSkillsPillar(profile),
    interest_alignment: buildInterestAlignmentPillar(profile),
  });
}

function rubricStrengths(rubric: AssessmentRubric): string[] {
  return uniq([
    rubric.motivation.band === "High"
      ? "Bạn có động lực học tương đối rõ và dễ duy trì khi thấy tiến bộ."
      : null,
    rubric.learning_style.band === "High"
      ? "Bạn tiếp nhận tốt khi được kết hợp ví dụ, thực hành và phản hồi."
      : null,
    rubric.foundation_skills.band === "High"
      ? "Bạn đang có nền tảng đủ tốt để đi vào các bài tập ứng dụng sớm hơn."
      : null,
    rubric.interest_alignment.band === "High"
      ? "Bạn đã có tín hiệu định hướng khá rõ để gắn việc học với mục tiêu cụ thể."
      : null,
  ]);
}

function rubricSupportNeeds(rubric: AssessmentRubric): string[] {
  return uniq([
    rubric.motivation.band === "Low"
      ? "Cần mục tiêu ngắn hạn và checkpoint thường xuyên để giữ động lực."
      : rubric.motivation.band === "Medium"
        ? "Nên giữ milestone rõ để tránh hụt nhịp giữa chặng học dài."
        : null,
    rubric.learning_style.band === "Low"
      ? "Cần bài học chia nhỏ hơn, ví dụ rõ hơn và ít yêu cầu tự suy diễn."
      : rubric.learning_style.band === "Medium"
        ? "Nên duy trì nhịp học có xen thực hành và nhắc lại kiến thức chính."
        : null,
    rubric.foundation_skills.band === "Low"
      ? "Cần thêm thời gian cho kiến thức nền trước khi tăng độ khó."
      : rubric.foundation_skills.band === "Medium"
        ? "Nên ôn chắc nền tảng song song với bài tập ứng dụng."
        : null,
    rubric.interest_alignment.band === "Low"
      ? "Nên tiếp tục khám phá thêm chủ đề để xác nhận hướng phù hợp lâu dài."
      : rubric.interest_alignment.band === "Medium"
        ? "Nên giữ không gian thử nghiệm trước khi chuyên sâu quá sớm."
        : null,
  ]);
}

function buildStudentNextSteps(
  rubric: AssessmentRubric,
  profile: LearnerProfile,
  analysis: LearnerAnalysis
): string[] {
  return uniq([
    rubric.foundation_skills.band === "Low"
      ? "Ưu tiên củng cố nền tảng kỹ thuật trước khi vào chuỗi bài quá nặng."
      : null,
    rubric.motivation.band !== "High"
      ? "Đặt mục tiêu theo tuần thay vì chỉ nhìn mục tiêu dài hạn."
      : null,
    rubric.interest_alignment.band !== "Low" && profile.interests[0]
      ? `Gắn bài học đầu tiên với chủ đề bạn quan tâm: ${profile.interests[0]}.`
      : "Thử thêm các chủ đề khác nhau để xem hướng nào giữ hứng thú tốt nhất.",
    `Nhịp học gợi ý hiện tại: ${analysis.recommended_pacing}.`,
    analysis.path_focus[0]
      ? `Giữ trọng tâm ngắn hạn vào: ${analysis.path_focus[0]}.`
      : null,
  ]).slice(0, 6);
}

export function buildStudentAssessmentView(args: {
  rubric: AssessmentRubric;
  profile: LearnerProfile;
  analysis: LearnerAnalysis;
  strengths: string[];
  weaknesses: string[];
}): StudentAssessmentView {
  const { rubric, profile, analysis, strengths, weaknesses } = args;
  const generatedStrengths = rubricStrengths(rubric);
  const generatedSupportNeeds = rubricSupportNeeds(rubric);

  return studentAssessmentViewSchema.parse({
    headline: `Bạn đang ở nhóm ${rubric.foundation_skills.band.toLowerCase()} về nền tảng và ${rubric.motivation.band.toLowerCase()} về động lực học.`,
    summary: `Kết quả hiện tại cho thấy hồ sơ ${profile.mbti_type} với mục tiêu ${profile.goal_summary.toLowerCase()}. Điểm mạnh chính nằm ở những trụ có band cao, còn các trụ band thấp hoặc trung bình là nơi nên ưu tiên hỗ trợ trước để việc học ổn định hơn.`,
    pacing_recommendation:
      analysis.recommended_pacing === "accelerated"
        ? "Bạn có thể theo nhịp tăng tốc, nhưng vẫn cần giữ checkpoint để tránh học nhanh mà hổng nền."
        : analysis.recommended_pacing === "slow"
          ? "Bạn nên học theo nhịp chậm chắc, tập trung hoàn thành từng chặng ngắn trước khi tăng tải."
          : "Bạn phù hợp với nhịp học ổn định theo tuần, tiến đều và có checkpoint rõ ràng.",
    strengths: uniq([...generatedStrengths, ...strengths]).slice(0, 6),
    support_needs: uniq([...generatedSupportNeeds, ...weaknesses]).slice(0, 6),
    next_steps: buildStudentNextSteps(rubric, profile, analysis),
  });
}

function readinessBandFromRubric(rubric: AssessmentRubric): AssessmentBand {
  const readinessScore = Math.round(
    rubric.foundation_skills.score * 0.4 +
      rubric.motivation.score * 0.3 +
      rubric.learning_style.score * 0.15 +
      rubric.interest_alignment.score * 0.15
  );
  return scoreToBand(readinessScore);
}

function buildTeacherRisks(
  rubric: AssessmentRubric,
  profile: LearnerProfile
): string[] {
  return uniq([
    ...profile.risk_flags,
    rubric.foundation_skills.band === "Low"
      ? "Nếu tăng độ khó quá sớm, nguy cơ hụt nền và bỏ dở sẽ cao."
      : null,
    rubric.motivation.band === "Low"
      ? "Nếu không có milestone gần và phản hồi đều, động lực dễ giảm nhanh."
      : null,
    rubric.learning_style.band === "Low"
      ? "Nếu bài học ít ví dụ hoặc nhảy bước mạnh, người học có thể mất bám theo."
      : null,
    rubric.interest_alignment.band === "Low"
      ? "Nếu khóa chặt quá sớm vào một domain, mức gắn kết có thể không bền."
      : null,
  ]).slice(0, 8);
}

function buildTeacherSupportStrategies(
  rubric: AssessmentRubric,
  analysis: LearnerAnalysis
): string[] {
  return uniq([
    rubric.foundation_skills.band === "Low"
      ? "Front-load các bài nền, giảm phụ thuộc vào project mở ở giai đoạn sớm."
      : null,
    rubric.motivation.band !== "High"
      ? "Thiết kế checkpoint ngắn, phản hồi sớm và định nghĩa rõ tiêu chí hoàn thành."
      : null,
    rubric.learning_style.band !== "High"
      ? "Giữ cấu trúc buổi học ổn định: khái niệm ngắn -> ví dụ -> thực hành -> recap."
      : null,
    rubric.interest_alignment.band === "High"
      ? "Neo ví dụ, project và case study vào domain người học đã quan tâm."
      : "Dành chỗ cho exploratory tasks trước khi chuyên sâu quá nhanh.",
    ...analysis.support_strategies,
  ]).slice(0, 8);
}

function buildTeacherInterventionCues(
  rubric: AssessmentRubric
): string[] {
  return uniq([
    rubric.motivation.band === "Low"
      ? "Can thiệp khi người học bắt đầu trễ milestone hoặc giảm tương tác liên tiếp."
      : null,
    rubric.foundation_skills.band === "Low"
      ? "Can thiệp khi lỗi nền lặp lại ở nhiều bài hoặc thời gian hoàn thành tăng mạnh."
      : null,
    rubric.learning_style.band === "Low"
      ? "Can thiệp khi người học hoàn thành bài nhưng không giải thích lại được quy trình."
      : null,
    rubric.interest_alignment.band === "Low"
      ? "Can thiệp khi mức gắn kết giảm rõ sau các bài không liên quan tới sở thích nổi bật."
      : null,
    "Ưu tiên rà soát lại pacing nếu có hai tuần liên tiếp không đạt mục tiêu học.",
  ]).slice(0, 8);
}

export function buildTeacherAssessmentView(args: {
  rubric: AssessmentRubric;
  profile: LearnerProfile;
  analysis: LearnerAnalysis;
}): TeacherAssessmentView {
  const { rubric, profile, analysis } = args;
  const readinessBand = readinessBandFromRubric(rubric);

  return teacherAssessmentViewSchema.parse({
    headline: `Learner readiness hiện ở mức ${readinessBand}.`,
    summary: `Rubric hiện tại cho thấy động lực ${rubric.motivation.band.toLowerCase()}, nền tảng ${rubric.foundation_skills.band.toLowerCase()}, phong cách học ${rubric.learning_style.band.toLowerCase()} và độ rõ định hướng ${rubric.interest_alignment.band.toLowerCase()}. Teacher nên xem đây là lớp presentation trên baseline deterministic hiện có, không thay source scoring gốc.`,
    readiness_band: readinessBand,
    pacing_guidance:
      analysis.recommended_pacing === "accelerated"
        ? "Có thể giao nhịp tăng tốc, nhưng nên giữ kiểm tra nền và chất lượng đầu ra thay vì chỉ nhìn tốc độ."
        : analysis.recommended_pacing === "slow"
          ? "Nên giữ pacing chậm chắc, giảm tải mỗi chặng và tăng tần suất feedback."
          : "Giữ pacing ổn định theo tuần; chỉ tăng tải khi completion và độ tự chủ còn tốt.",
    primary_risks: buildTeacherRisks(rubric, profile),
    support_strategies: buildTeacherSupportStrategies(rubric, analysis),
    intervention_cues: buildTeacherInterventionCues(rubric),
  });
}
