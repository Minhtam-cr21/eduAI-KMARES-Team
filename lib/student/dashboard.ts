import type { SupabaseClient } from "@supabase/supabase-js";

import { buildEnrichedScheduleSnapshot } from "@/lib/study-schedule/snapshot";
import { loadStudentEnrolledCourses } from "@/lib/user-courses/enrolled";

type DashboardAlertTone = "normal" | "warning" | "critical";

export type StudentDashboardSnapshot = {
  tasks_today: Array<{
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    priority: string;
    soft_deadline_level: string | null;
    reason: string;
    href: string | null;
  }>;
  week_status: {
    week_start: string | null;
    week_end: string | null;
    total_items: number;
    pending_items: number;
    overdue_items: number;
    slip_count: number;
    risk_level: string;
    high_load_detected: boolean;
    imbalance_detected: boolean;
  } | null;
  roadmap_progress: {
    status: string | null;
    total_courses: number;
    approved_paths: number;
    active_paths: number;
    latest_updated_at: string | null;
  };
  pace_alert: {
    tone: DashboardAlertTone;
    title: string;
    message: string;
  } | null;
  enrolled_courses_count: number;
};

export async function loadStudentDashboardSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  data: StudentDashboardSnapshot;
  error: string | null;
}> {
  const [
    scheduleRowsResult,
    pathsResult,
    enrolledCoursesResult,
  ] = await Promise.all([
    supabase
      .from("study_schedule")
      .select("id, due_date, status, miss_count, completed_at, path_id, lesson_id")
      .eq("user_id", userId)
      .order("due_date", { ascending: true }),
    supabase
      .from("personalized_paths")
      .select("id, status, course_sequence, updated_at")
      .eq("student_id", userId)
      .order("updated_at", { ascending: false }),
    loadStudentEnrolledCourses(supabase, userId),
  ]);

  if (scheduleRowsResult.error) {
    return {
      data: emptyDashboardSnapshot(),
      error: scheduleRowsResult.error.message,
    };
  }

  if (pathsResult.error) {
    return {
      data: emptyDashboardSnapshot(),
      error: pathsResult.error.message,
    };
  }

  const snapshot = await buildEnrichedScheduleSnapshot(
    supabase,
    scheduleRowsResult.data ?? [],
    { studentId: userId }
  );
  if (snapshot.error) {
    return {
      data: emptyDashboardSnapshot(),
      error: snapshot.error,
    };
  }

  const today = snapshot.data.items
    .filter((item) => item.due_date === snapshot.data.analysis.as_of_date)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      title: item.lesson?.title ?? "Bài học",
      due_date: item.due_date,
      status: item.status,
      priority: item.priority,
      soft_deadline_level: item.soft_deadline_level,
      reason:
        item.adjustment_proposal?.proposal_reason ??
        item.adjustment_proposal?.suggested_action ??
        "Giữ theo lịch hiện tại.",
      href:
        item.lesson?.course_id && item.lesson?.id
          ? `/student/courses/${item.lesson.course_id}/lessons/${item.lesson.id}`
          : null,
    }));

  const currentWeek =
    snapshot.data.analysis.weekly_analysis.find(
      (week) => week.week_start <= snapshot.data.analysis.as_of_date
        && week.week_end >= snapshot.data.analysis.as_of_date
    ) ??
    snapshot.data.analysis.weekly_analysis.at(-1) ??
    null;

  const paths = pathsResult.data ?? [];
  const roadmapProgress = {
    status: (paths[0]?.status as string | null) ?? null,
    total_courses: paths.reduce((sum, path) => {
      const sequence = Array.isArray(path.course_sequence)
        ? path.course_sequence
        : [];
      return Math.max(sum, sequence.length);
    }, 0),
    approved_paths: paths.filter((path) =>
      ["approved", "active", "paused", "pending_student_approval"].includes(
        (path.status as string) ?? ""
      )
    ).length,
    active_paths: paths.filter((path) =>
      ["active", "paused"].includes((path.status as string) ?? "")
    ).length,
    latest_updated_at: (paths[0]?.updated_at as string | null) ?? null,
  };

  const paceAlert = buildPaceAlert({
    summary: snapshot.data.summary,
    week: currentWeek,
    recommendations: snapshot.data.analysis.recommendations,
  });

  return {
    data: {
      tasks_today: today,
      week_status: currentWeek
        ? {
            week_start: currentWeek.week_start,
            week_end: currentWeek.week_end,
            total_items: currentWeek.total_items,
            pending_items: currentWeek.pending_items,
            overdue_items: currentWeek.overdue_items,
            slip_count: currentWeek.slip_count,
            risk_level: currentWeek.risk_level,
            high_load_detected: currentWeek.high_load_detected,
            imbalance_detected: currentWeek.imbalance_detected,
          }
        : null,
      roadmap_progress: roadmapProgress,
      pace_alert: paceAlert,
      enrolled_courses_count: enrolledCoursesResult.data?.courses.length ?? 0,
    },
    error: null,
  };
}

function buildPaceAlert(args: {
  summary: {
    overdue: number;
    frozen: number;
  };
  week: StudentDashboardSnapshot["week_status"];
  recommendations: string[];
}): StudentDashboardSnapshot["pace_alert"] {
  if (args.summary.frozen > 0) {
    return {
      tone: "critical",
      title: "Lịch học đang bị đóng băng",
      message:
        "Một số mục đã được freeze có kiểm soát. Bạn nên xem lại lịch học hoặc liên hệ giáo viên để điều chỉnh nhịp.",
    };
  }
  if (args.summary.overdue > 0 || args.week?.risk_level === "high") {
    return {
      tone: "warning",
      title: "Có dấu hiệu lệch nhịp",
      message:
        args.recommendations[0] ??
        "Lịch tuần này đang có rủi ro cao hơn bình thường. Nên ưu tiên xử lý các mục gần hạn trước.",
    };
  }
  if (args.week?.high_load_detected || args.week?.imbalance_detected) {
    return {
      tone: "warning",
      title: "Tuần này hơi dồn tải",
      message:
        "Khối lượng học tập trong tuần đang cao hoặc lệch tải. Hãy giữ nhịp đều để tránh trượt deadline.",
    };
  }
  return {
    tone: "normal",
    title: "Nhịp học đang ổn",
    message:
      args.recommendations[0] ??
      "Bạn đang theo đúng nhịp hiện tại. Tiếp tục hoàn thành các mục trong tuần để giữ tiến độ.",
  };
}

function emptyDashboardSnapshot(): StudentDashboardSnapshot {
  return {
    tasks_today: [],
    week_status: null,
    roadmap_progress: {
      status: null,
      total_courses: 0,
      approved_paths: 0,
      active_paths: 0,
      latest_updated_at: null,
    },
    pace_alert: null,
    enrolled_courses_count: 0,
  };
}
