import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type LearnerAnalysis,
  type LearnerProfile,
  learnerAnalysisSchema,
  learnerProfileSchema,
} from "@/lib/assessment/contracts";
import {
  type AssessmentRubric,
  type TeacherAssessmentView,
  buildAssessmentRubric,
  buildTeacherAssessmentView,
} from "@/lib/assessment/rubric";
import { teacherPathReviewRecordSchema, teacherScheduleInsightReviewRecordSchema } from "@/lib/teacher/review-contracts";
import { listTeacherReviewEvents } from "@/lib/teacher/review-store";
import { loadTeacherPersonalizedPathEditorData } from "./personalized-path-editor";
import { loadTeacherStudentScheduleSnapshot } from "./schedule-insight";

export type TeacherStudentWorkspaceData = {
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    goal: string | null;
    hours_per_day: number | null;
  };
  assessment: {
    learner_profile: LearnerProfile | null;
    ai_analysis: LearnerAnalysis | null;
    rubric: AssessmentRubric | null;
    teacher_view: TeacherAssessmentView | null;
    analysis_source: string | null;
    assessment_version: string | null;
  };
  progress: {
    progress_percent: number;
    total_paths: number;
    completed_paths: number;
  };
  personalized_path: Awaited<
    ReturnType<typeof loadTeacherPersonalizedPathEditorData>
  >["data"];
  schedule: Awaited<ReturnType<typeof loadTeacherStudentScheduleSnapshot>>;
  path_review_history: Array<ReturnType<typeof teacherPathReviewRecordSchema.parse>>;
  schedule_review_history: Array<
    ReturnType<typeof teacherScheduleInsightReviewRecordSchema.parse>
  >;
};

export async function loadTeacherStudentWorkspaceData(args: {
  supabase: SupabaseClient;
  teacherId: string;
  studentId: string;
  isAdmin: boolean;
}): Promise<{
  data: TeacherStudentWorkspaceData | null;
  error: string | null;
  status: number;
}> {
  const { supabase, teacherId, studentId, isAdmin } = args;

  const [profileResult, progressResult, assessmentResult, pathResult, scheduleResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, role, full_name, email, goal, hours_per_day")
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("learning_paths")
        .select("id, status")
        .eq("student_id", studentId),
      supabase
        .from("career_orientations")
        .select(
          "learner_profile, ai_analysis, analysis_source, assessment_version, created_at"
        )
        .eq("user_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      loadTeacherPersonalizedPathEditorData({
        supabase,
        userId: teacherId,
        studentId,
        isAdmin,
      }),
      loadTeacherStudentScheduleSnapshot(supabase, studentId),
    ]);

  if (profileResult.error) {
    return { data: null, error: profileResult.error.message, status: 500 };
  }

  const profile = profileResult.data;
  if (!profile || profile.role !== "student") {
    return { data: null, error: "Không tìm thấy học sinh.", status: 404 };
  }

  if (pathResult.error || !pathResult.data) {
    return {
      data: null,
      error: pathResult.error ?? "Không tải được personalized path.",
      status: pathResult.status,
    };
  }

  if (scheduleResult.error) {
    return {
      data: null,
      error: scheduleResult.error,
      status: scheduleResult.status ?? 500,
    };
  }

  const learningPaths = progressResult.data ?? [];
  const totalPaths = learningPaths.length;
  const completedPaths = learningPaths.filter((item) => item.status === "completed").length;
  const progressPercent = totalPaths === 0 ? 0 : Math.round((completedPaths / totalPaths) * 100);

  const learnerProfileParse = learnerProfileSchema.safeParse(
    assessmentResult.data?.learner_profile
  );
  const learnerAnalysisParse = learnerAnalysisSchema.safeParse(
    assessmentResult.data?.ai_analysis
  );

  const learnerProfile = learnerProfileParse.success ? learnerProfileParse.data : null;
  const learnerAnalysis = learnerAnalysisParse.success ? learnerAnalysisParse.data : null;
  const rubric = learnerProfile ? buildAssessmentRubric(learnerProfile) : null;
  let teacherView: TeacherAssessmentView | null = null;
  if (learnerProfile && learnerAnalysis && rubric) {
    teacherView = buildTeacherAssessmentView({
      rubric,
      profile: learnerProfile,
      analysis: learnerAnalysis,
    });
  }

  const [pathReviews, scheduleReviews] = await Promise.all([
    listTeacherReviewEvents(supabase, {
      reviewKind: "personalized_path",
      teacherId: isAdmin ? undefined : teacherId,
      studentId,
      limit: 6,
    }),
    listTeacherReviewEvents(supabase, {
      reviewKind: "schedule_insight",
      teacherId: isAdmin ? undefined : teacherId,
      studentId,
      limit: 6,
    }),
  ]);

  if (pathReviews.error) {
    return { data: null, error: pathReviews.error, status: 500 };
  }
  if (scheduleReviews.error) {
    return { data: null, error: scheduleReviews.error, status: 500 };
  }
  if (pathReviews.schemaError) {
    return { data: null, error: pathReviews.schemaError.message, status: 500 };
  }
  if (scheduleReviews.schemaError) {
    return { data: null, error: scheduleReviews.schemaError.message, status: 500 };
  }

  const parsedPathReviews = pathReviews.data
    .map((row) =>
      teacherPathReviewRecordSchema.safeParse({
        ...row,
        snapshot: row.snapshot,
      })
    )
    .filter((result) => result.success)
    .map((result) => result.data);

  const parsedScheduleReviews = scheduleReviews.data
    .map((row) =>
      teacherScheduleInsightReviewRecordSchema.safeParse({
        ...row,
        snapshot: row.snapshot,
      })
    )
    .filter((result) => result.success)
    .map((result) => result.data);

  return {
    data: {
      student: {
        id: profile.id as string,
        full_name: (profile.full_name as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
        goal: (profile.goal as string | null) ?? null,
        hours_per_day: (profile.hours_per_day as number | null) ?? null,
      },
      assessment: {
        learner_profile: learnerProfile,
        ai_analysis: learnerAnalysis,
        rubric,
        teacher_view: teacherView,
        analysis_source: (assessmentResult.data?.analysis_source as string | null) ?? null,
        assessment_version:
          (assessmentResult.data?.assessment_version as string | null) ?? null,
      },
      progress: {
        progress_percent: progressPercent,
        total_paths: totalPaths,
        completed_paths: completedPaths,
      },
      personalized_path: pathResult.data,
      schedule: scheduleResult,
      path_review_history: parsedPathReviews,
      schedule_review_history: parsedScheduleReviews,
    },
    error: null,
    status: 200,
  };
}
