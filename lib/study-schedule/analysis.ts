import type {
  EnrichedScheduleItem,
  ScheduleAdjustmentProposal,
  ScheduleAnalysisSnapshot,
  ScheduleLoadBucket,
  SchedulePriority,
  ScheduleRiskLevel,
  ScheduleSummary,
  SoftDeadlineLevel,
  TeacherScheduleRecommendation,
  WeeklyLearningAnalysis,
} from "./contracts";
import type { ScheduleLearnerContext } from "./learner-context";

export type SchedulableItem = {
  id: string;
  due_date: string | null;
  status: string | null;
  miss_count?: number | null;
  path_id?: string | null;
};

function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parseUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekStartUtc(value: string): string {
  const date = parseUtcDate(value);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatUtcDate(date);
}

function weekEndFromStart(value: string): string {
  const date = parseUtcDate(value);
  date.setUTCDate(date.getUTCDate() + 6);
  return formatUtcDate(date);
}

function daysUntil(asOfDate: string, dueDate: string): number {
  const start = parseUtcDate(asOfDate);
  const end = parseUtcDate(dueDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function isOverdue(item: SchedulableItem, todayKey: string): boolean {
  if (item.status !== "pending" || !item.due_date) return false;
  return item.due_date < todayKey;
}

function priorityFromScore(score: number): SchedulePriority {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "normal";
  return "light";
}

function deriveSoftDeadlineLevel(args: {
  item: SchedulableItem;
  asOfDate: string;
  highLoadDetected: boolean;
  learnerContext?: ScheduleLearnerContext | null;
}): SoftDeadlineLevel | null {
  if (args.item.status === "frozen") return "level_4";
  const missCount = Math.max(0, args.item.miss_count ?? 0);
  const hasLearnerRisk =
    (args.learnerContext?.learner_profile?.risk_flags.length ?? 0) > 0 ||
    args.learnerContext?.ai_analysis?.recommended_pacing === "slow";

  if (missCount >= 3 || (args.item.status === "pending" && hasLearnerRisk && missCount >= 2)) {
    return "level_4";
  }
  if (missCount >= 2 || (args.highLoadDetected && args.item.status === "pending")) {
    return "level_3";
  }
  if (missCount >= 1) {
    return "level_2";
  }
  if (args.item.due_date && daysUntil(args.asOfDate, args.item.due_date) <= 1) {
    return "level_1";
  }
  return null;
}

function buildProposal(args: {
  item: SchedulableItem;
  asOfDate: string;
  priority: SchedulePriority;
  softDeadlineLevel: SoftDeadlineLevel | null;
  learnerContext?: ScheduleLearnerContext | null;
}): ScheduleAdjustmentProposal | null {
  if (!args.softDeadlineLevel) return null;

  const dueDate = args.item.due_date;
  const learnerSlow = args.learnerContext?.ai_analysis?.recommended_pacing === "slow";
  const riskHeavy = (args.learnerContext?.learner_profile?.risk_flags.length ?? 0) >= 2;
  let proposedDueDate: string | null = dueDate;
  let proposalReason = "";
  let suggestedAction = "";

  if (args.softDeadlineLevel === "level_1") {
    proposedDueDate = dueDate ? formatUtcDate(new Date(`${dueDate}T12:00:00.000Z`)) : null;
    if (proposedDueDate) {
      const shifted = new Date(`${proposedDueDate}T12:00:00.000Z`);
      shifted.setUTCDate(shifted.getUTCDate() + 1);
      proposedDueDate = formatUtcDate(shifted);
    }
    proposalReason = "Dời nhẹ hạn gần nhất để tránh trượt deadline ngay trong 24 giờ tới.";
    suggestedAction = "Giữ cấu trúc lịch hiện tại, chỉ dời nhẹ một mục gần hạn.";
  }

  if (args.softDeadlineLevel === "level_2") {
    proposedDueDate = dueDate ? formatUtcDate(new Date(`${dueDate}T12:00:00.000Z`)) : null;
    if (proposedDueDate) {
      const shifted = new Date(`${proposedDueDate}T12:00:00.000Z`);
      shifted.setUTCDate(shifted.getUTCDate() + (learnerSlow ? 3 : 2));
      proposedDueDate = formatUtcDate(shifted);
    }
    proposalReason =
      "Giảm tải tuần hiện tại vì đã có dấu hiệu trượt hoặc áp lực học tăng lên.";
    suggestedAction =
      "Dời cụm việc gần hạn và giảm số mục nặng trong cùng tuần.";
  }

  if (args.softDeadlineLevel === "level_3") {
    proposedDueDate = dueDate ? formatUtcDate(new Date(`${dueDate}T12:00:00.000Z`)) : null;
    if (proposedDueDate) {
      const shifted = new Date(`${proposedDueDate}T12:00:00.000Z`);
      shifted.setUTCDate(shifted.getUTCDate() + (learnerSlow || riskHeavy ? 5 : 4));
      proposedDueDate = formatUtcDate(shifted);
    }
    proposalReason =
      "Cần tái cân bằng các task sau vì lịch đã có nhiều lần trượt hoặc tuần bị dồn tải.";
    suggestedAction =
      "Dời mục này xa hơn, sau đó review lại toàn bộ chuỗi task kế tiếp.";
  }

  if (args.softDeadlineLevel === "level_4") {
    proposedDueDate = null;
    proposalReason =
      "Đã vượt ngưỡng an toàn của soft-deadline policy; cần freeze có kiểm soát và teacher review.";
    suggestedAction =
      "Đóng băng mục hiện tại hoặc cả cụm pending liên quan, sau đó yêu cầu teacher can thiệp.";
  }

  return {
    item_id: args.item.id,
    priority: args.priority,
    soft_deadline_level: args.softDeadlineLevel,
    proposed_due_date: proposedDueDate,
    proposal_reason: proposalReason,
    suggested_action: suggestedAction,
  };
}

function buildRecommendations(args: {
  summary: ScheduleSummary;
  weeklyLoad: ScheduleLoadBucket[];
  weeklyAnalysis: WeeklyLearningAnalysis[];
  items: SchedulableItem[];
  learnerContext?: ScheduleLearnerContext | null;
}): string[] {
  const out: string[] = [];
  const totalMissCount = args.items.reduce(
    (sum, item) => sum + Math.max(0, item.miss_count ?? 0),
    0
  );
  const busiestWeek = args.weeklyLoad.reduce<ScheduleLoadBucket | null>(
    (current, bucket) =>
      !current || bucket.total_items > current.total_items ? bucket : current,
    null
  );

  if (args.summary.total === 0) {
    out.push("Chưa có mục study_schedule hoạt động để phân tích.");
    return out;
  }
  if (args.summary.overdue > 0) {
    out.push(
      `Có ${args.summary.overdue} mục đang quá hạn; nên dời hạn hoặc giảm tải ở tuần gần nhất.`
    );
  }
  if (args.summary.frozen > 0) {
    out.push(
      `Có ${args.summary.frozen} mục đang frozen; cần kiểm tra lại hoạt động học gần đây trước khi tăng lịch mới.`
    );
  }
  if (totalMissCount >= 3) {
    out.push(
      `Lịch đã trượt ${totalMissCount} lần theo miss_count; nên ưu tiên milestone ngắn hơn và nhắc lại đều hơn.`
    );
  }
  if (busiestWeek && busiestWeek.total_items >= 4) {
    out.push(
      `Tuần bắt đầu ${busiestWeek.week_start} có tải cao nhất với ${busiestWeek.total_items} mục; teacher nên review tuần này trước.`
    );
  }
  if (args.summary.pending > 0 && args.summary.overdue === 0) {
    out.push("Lịch hiện chưa có mục quá hạn; có thể giữ nhịp hiện tại và chỉ tinh chỉnh tuần tải cao.");
  }
  if (args.weeklyAnalysis.some((week) => week.imbalance_detected)) {
    out.push("Có tuần bị lệch tải rõ rệt giữa các mục; nên tái cân bằng thứ tự ưu tiên thay vì chỉ dời hạn cục bộ.");
  }
  if (args.learnerContext?.ai_analysis?.recommended_pacing === "slow") {
    out.push("Learner profile đang nghiêng về pacing chậm chắc; không nên giữ lịch dồn tải liên tiếp.");
  }
  if (out.length === 0) {
    out.push("Lịch học đang ổn định; tiếp tục theo dõi tiến độ hoàn thành và tải theo tuần.");
  }
  return out.slice(0, 8);
}

function deriveWeeklyRisk(week: {
  overdue_items: number;
  total_items: number;
  slip_count: number;
  high_load_detected: boolean;
  imbalance_detected: boolean;
}): ScheduleRiskLevel {
  if (
    week.overdue_items >= 2 ||
    week.slip_count >= 3 ||
    (week.high_load_detected && week.imbalance_detected)
  ) {
    return "high";
  }
  if (
    week.overdue_items >= 1 ||
    week.slip_count >= 1 ||
    week.high_load_detected ||
    week.imbalance_detected
  ) {
    return "medium";
  }
  return "low";
}

function buildTeacherRecommendations(args: {
  items: Array<SchedulableItem & { priority: SchedulePriority }>;
  summary: ScheduleSummary;
  weeklyAnalysis: WeeklyLearningAnalysis[];
  learnerContext?: ScheduleLearnerContext | null;
}): TeacherScheduleRecommendation[] {
  const highPriorityItems = args.items.filter(
    (item) => item.priority === "critical" || item.priority === "high"
  );
  const out: TeacherScheduleRecommendation[] = [];

  if (args.summary.pending > 0 && args.summary.overdue === 0 && highPriorityItems.length <= 2) {
    out.push({
      recommendation_type: "keep_pace",
      priority: "normal",
      rationale:
        "Schedule vẫn đang on-track và số item ưu tiên cao chưa vượt ngưỡng đáng lo.",
      recommended_action: "Giữ nhịp hiện tại, chỉ quan sát tuần có tải cao.",
      target_item_ids: [],
    });
  }

  if (args.weeklyAnalysis.some((week) => week.high_load_detected)) {
    out.push({
      recommendation_type: "reduce_load",
      priority: "high",
      rationale:
        "Phát hiện tuần tải cao, dễ kéo theo dồn deadline hoặc trượt tiếp nếu giữ nguyên nhịp.",
      recommended_action:
        "Giảm số mục trong tuần cao tải hoặc dời một phần sang tuần kế tiếp.",
      target_item_ids: highPriorityItems.slice(0, 4).map((item) => item.id),
    });
  }

  if (highPriorityItems.length >= 3 || args.weeklyAnalysis.some((week) => week.imbalance_detected)) {
    out.push({
      recommendation_type: "change_priority",
      priority: "high",
      rationale:
        "Có dấu hiệu mất cân bằng hoặc nhiều item cạnh tranh cùng lúc trong ngắn hạn.",
      recommended_action:
        "Đổi ưu tiên các mục gần hạn, đưa phần nhẹ hơn xuống sau để tránh đứt nhịp.",
      target_item_ids: highPriorityItems.slice(0, 6).map((item) => item.id),
    });
  }

  if (
    args.summary.frozen > 0 ||
    args.items.some((item) => item.priority === "critical" && (item.miss_count ?? 0) >= 2) ||
    args.learnerContext?.ai_analysis?.recommended_pacing === "slow"
  ) {
    out.push({
      recommendation_type: "needs_intervention",
      priority: "critical",
      rationale:
        "Lịch đã chạm ngưỡng cần teacher can thiệp: có frozen item, repeated slip hoặc pacing learner không còn hợp với tải hiện tại.",
      recommended_action:
        "Teacher review trực tiếp, xác nhận lại pacing và quyết định freeze/override có kiểm soát.",
      target_item_ids: args.items
        .filter(
          (item) =>
            item.priority === "critical" ||
            item.status === "frozen" ||
            (item.miss_count ?? 0) >= 2
        )
        .slice(0, 8)
        .map((item) => item.id),
    });
  }

  if (out.length === 0) {
    out.push({
      recommendation_type: "keep_pace",
      priority: "light",
      rationale: "Chưa thấy tín hiệu cần đổi cấu trúc lịch ở thời điểm hiện tại.",
      recommended_action: "Tiếp tục theo dõi lịch và chỉ can thiệp khi có slip mới.",
      target_item_ids: [],
    });
  }

  return out.slice(0, 8);
}

export function buildSmartScheduleAnalysis<T extends SchedulableItem>(
  items: T[],
  options?: {
    asOfDate?: string;
    learnerContext?: ScheduleLearnerContext | null;
  }
): {
  items: Array<
    T & {
      priority: SchedulePriority;
      soft_deadline_level: SoftDeadlineLevel | null;
      priority_score: number;
      adjustment_proposal: ScheduleAdjustmentProposal | null;
    }
  >;
  summary: ScheduleSummary;
  analysis: ScheduleAnalysisSnapshot;
} {
  const asOfDate = options?.asOfDate ?? getUtcDateKey();
  const weeklyLoadMap = new Map<string, ScheduleLoadBucket>();
  const slipByWeek = new Map<string, number>();

  const total = items.length;
  const pending = items.filter((item) => item.status === "pending").length;
  const completed = items.filter((item) => item.status === "completed").length;
  const frozen = items.filter((item) => item.status === "frozen").length;
  const overdue = items.filter((item) => isOverdue(item, asOfDate)).length;
  const totalSlipCount = items.reduce(
    (sum, item) => sum + Math.max(0, item.miss_count ?? 0),
    0
  );

  for (const item of items) {
    if (!item.due_date) continue;
    const start = weekStartUtc(item.due_date);
    const bucket = weeklyLoadMap.get(start) ?? {
      week_start: start,
      week_end: weekEndFromStart(start),
      total_items: 0,
      pending_items: 0,
      completed_items: 0,
      overdue_items: 0,
    };
    bucket.total_items += 1;
    if (item.status === "pending") bucket.pending_items += 1;
    if (item.status === "completed") bucket.completed_items += 1;
    if (isOverdue(item, asOfDate)) bucket.overdue_items += 1;
    weeklyLoadMap.set(start, bucket);
    slipByWeek.set(start, (slipByWeek.get(start) ?? 0) + Math.max(0, item.miss_count ?? 0));
  }

  const weeklyLoad = Array.from(weeklyLoadMap.values())
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-8);

  const weeklyAnalysis: WeeklyLearningAnalysis[] = weeklyLoad.map((week) => {
    const slipCount = slipByWeek.get(week.week_start) ?? 0;
    const highLoadDetected = week.total_items >= 4 || week.pending_items >= 3;
    const imbalanceDetected =
      week.total_items >= 3 &&
      ((week.completed_items === 0 && week.pending_items >= 2) ||
        week.overdue_items >= Math.max(1, Math.ceil(week.total_items / 2)));

    return {
      week_start: week.week_start,
      week_end: week.week_end,
      total_items: week.total_items,
      pending_items: week.pending_items,
      completed_items: week.completed_items,
      overdue_items: week.overdue_items,
      slip_count: slipCount,
      risk_level: deriveWeeklyRisk({
        overdue_items: week.overdue_items,
        total_items: week.total_items,
        slip_count: slipCount,
        high_load_detected: highLoadDetected,
        imbalance_detected: imbalanceDetected,
      }),
      high_load_detected: highLoadDetected,
      imbalance_detected: imbalanceDetected,
    };
  });

  const summary: ScheduleSummary = {
    total,
    pending,
    completed,
    overdue,
    frozen,
    estimated_hours_total: null,
    estimated_hours_pending: null,
  };

  const weekMeta = new Map(
    weeklyAnalysis.map((week) => [week.week_start, week] as const)
  );

  const annotatedItems = items.map((item) => {
    const week = item.due_date ? weekMeta.get(weekStartUtc(item.due_date)) : null;
    let priorityScore = 0;

    if (!item.due_date) {
      priorityScore += 10;
    } else {
      const delta = daysUntil(asOfDate, item.due_date);
      if (delta < 0) priorityScore += 45;
      else if (delta <= 1) priorityScore += 35;
      else if (delta <= 3) priorityScore += 25;
      else if (delta <= 7) priorityScore += 15;
      else priorityScore += 5;
    }

    const missCount = Math.max(0, item.miss_count ?? 0);
    priorityScore += Math.min(30, missCount * 12);

    if (item.status === "frozen") priorityScore += 30;
    else if (isOverdue(item, asOfDate)) priorityScore += 20;

    if (week?.high_load_detected) priorityScore += 10;
    if (week?.imbalance_detected) priorityScore += 8;
    if (week?.risk_level === "high") priorityScore += 10;

    const learnerProfile = options?.learnerContext?.learner_profile;
    const aiAnalysis = options?.learnerContext?.ai_analysis;
    if (learnerProfile) {
      if (learnerProfile.trait_scores.foundationSkills < 45) priorityScore += 8;
      if (learnerProfile.risk_flags.length >= 2) priorityScore += 8;
    }
    if (aiAnalysis?.recommended_pacing === "slow") {
      priorityScore += 8;
    }

    const priority = priorityFromScore(priorityScore);
    const softDeadlineLevel = deriveSoftDeadlineLevel({
      item,
      asOfDate,
      highLoadDetected: week?.high_load_detected ?? false,
      learnerContext: options?.learnerContext,
    });
    const adjustmentProposal = buildProposal({
      item,
      asOfDate,
      priority,
      softDeadlineLevel,
      learnerContext: options?.learnerContext,
    });

    return {
      ...item,
      priority,
      soft_deadline_level: softDeadlineLevel,
      priority_score: priorityScore,
      adjustment_proposal: adjustmentProposal,
    };
  });

  const adjustmentProposals = annotatedItems
    .map((item) => item.adjustment_proposal)
    .filter((item): item is ScheduleAdjustmentProposal => Boolean(item))
    .slice(0, 12);

  const teacherRecommendations = buildTeacherRecommendations({
    items: annotatedItems,
    summary,
    weeklyAnalysis,
    learnerContext: options?.learnerContext,
  });

  return {
    items: annotatedItems,
    summary,
    analysis: {
      analysis_source: "rule_based",
      engine_version: "smart_schedule_v2",
      as_of_date: asOfDate,
      weekly_load: weeklyLoad,
      weekly_analysis: weeklyAnalysis,
      total_slip_count: totalSlipCount,
      high_load_detected: weeklyAnalysis.some((week) => week.high_load_detected),
      imbalance_detected: weeklyAnalysis.some((week) => week.imbalance_detected),
      recommended_pacing:
        options?.learnerContext?.ai_analysis?.recommended_pacing ?? "steady",
      recommendations: buildRecommendations({
        summary,
        weeklyLoad,
        weeklyAnalysis,
        items,
        learnerContext: options?.learnerContext,
      }),
      teacher_recommendations: teacherRecommendations,
      adjustment_proposals: adjustmentProposals,
    },
  };
}

export function analyzeScheduleItems<T extends SchedulableItem>(
  items: T[],
  asOfDate = getUtcDateKey()
): {
  summary: ScheduleSummary;
  analysis: ScheduleAnalysisSnapshot;
} {
  const result = buildSmartScheduleAnalysis(items, { asOfDate });
  return {
    summary: result.summary,
    analysis: result.analysis,
  };
}
