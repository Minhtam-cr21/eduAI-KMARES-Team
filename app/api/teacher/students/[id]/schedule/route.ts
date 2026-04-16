import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { insertScheduleAdjustmentLog } from "@/lib/study-schedule/adjustment-log-store";
import {
  teacherScheduleInsightReviewRecordSchema,
  teacherScheduleReviewCreateSchema,
} from "@/lib/teacher/review-contracts";
import { insertTeacherReviewEvent, listTeacherReviewEvents } from "@/lib/teacher/review-store";
import { schemaSyncErrorResponse } from "@/lib/supabase/schema-sync";
import { loadTeacherStudentScheduleSnapshot } from "@/lib/teacher/schedule-insight";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET — student's study_schedule rows visible to the teacher via RLS (paths owned by this teacher).
 * Enriches rows with lesson and course titles, same shape as `/api/study-schedule`.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const studentId = params.id;
  const snapshot = await loadTeacherStudentScheduleSnapshot(gate.supabase, studentId);
  if (snapshot.error) {
    return NextResponse.json({ error: snapshot.error }, { status: snapshot.status ?? 500 });
  }

  const reviews = await listTeacherReviewEvents(gate.supabase, {
    reviewKind: "schedule_insight",
    teacherId: gate.userId,
    studentId,
    limit: 5,
  });
  if (reviews.schemaError) {
    return schemaSyncErrorResponse(reviews.schemaError);
  }
  if (reviews.error) {
    return NextResponse.json({ error: reviews.error }, { status: 500 });
  }

  const parsedReviews = reviews.data
    .map((row) =>
      teacherScheduleInsightReviewRecordSchema.safeParse({
        ...row,
        snapshot: row.snapshot,
      })
    )
    .filter((result) => result.success)
    .map((result) => result.data);

  return NextResponse.json({
    student: snapshot.student,
    items: snapshot.items,
    summary: snapshot.summary,
    analysis: snapshot.analysis,
    latestReview: parsedReviews[0] ?? null,
    reviewHistory: parsedReviews,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = teacherScheduleReviewCreateSchema.safeParse({
    ...(typeof json === "object" && json ? json : {}),
    studentId: params.id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const snapshot = await loadTeacherStudentScheduleSnapshot(
    gate.supabase,
    parsed.data.studentId
  );
  if (snapshot.error) {
    return NextResponse.json({ error: snapshot.error }, { status: snapshot.status ?? 500 });
  }

  const inserted = await insertTeacherReviewEvent(gate.supabase, {
    teacher_id: gate.userId,
    student_id: parsed.data.studentId,
    review_kind: "schedule_insight",
    review_status: parsed.data.reviewStatus,
    risk_level: parsed.data.riskLevel,
    source: snapshot.analysis.analysis_source,
    action_recommendation: parsed.data.actionRecommendation || null,
    review_note: parsed.data.reviewNote || null,
    snapshot: {
      summary: snapshot.summary,
      analysis_source: snapshot.analysis.analysis_source,
      engine_version: snapshot.analysis.engine_version,
      as_of_date: snapshot.analysis.as_of_date,
      recommendations: snapshot.analysis.recommendations,
      weekly_analysis: snapshot.analysis.weekly_analysis,
      total_slip_count: snapshot.analysis.total_slip_count,
      high_load_detected: snapshot.analysis.high_load_detected,
      imbalance_detected: snapshot.analysis.imbalance_detected,
      teacher_recommendations: snapshot.analysis.teacher_recommendations,
      adjustment_proposals: snapshot.analysis.adjustment_proposals,
    },
  });
  if (inserted.schemaError) {
    return schemaSyncErrorResponse(inserted.schemaError);
  }
  if (inserted.error) {
    return NextResponse.json({ error: inserted.error }, { status: 500 });
  }

  if (
    parsed.data.overridePriority ||
    parsed.data.overridePacing ||
    parsed.data.overrideLevel
  ) {
    const targetItem =
      snapshot.items.find((item) => item.id === parsed.data.targetItemId) ??
      snapshot.items.find((item) => item.adjustment_proposal) ??
      snapshot.items.find((item) => item.path_id);

    if (targetItem?.path_id) {
      const logged = await insertScheduleAdjustmentLog(gate.supabase, {
        user_id: parsed.data.studentId,
        schedule_item_id: targetItem.id,
        teacher_id: gate.userId,
        path_id: targetItem.path_id,
        adjustment_source: "teacher_override",
        adjustment_level:
          parsed.data.overrideLevel ??
          targetItem.soft_deadline_level ??
          "level_1",
        priority_before: targetItem.priority,
        priority_after: parsed.data.overridePriority ?? targetItem.priority,
        pacing_override: parsed.data.overridePacing ?? null,
        decision_note:
          parsed.data.reviewNote ||
          parsed.data.actionRecommendation ||
          null,
        snapshot: {
          review_status: parsed.data.reviewStatus,
          risk_level: parsed.data.riskLevel,
          target_item_id: targetItem.id,
          target_item_priority: targetItem.priority,
          target_item_soft_deadline_level: targetItem.soft_deadline_level,
          teacher_recommendations: snapshot.analysis.teacher_recommendations,
        },
      });
      if (logged.schemaError) {
        return schemaSyncErrorResponse(logged.schemaError);
      }
      if (logged.error) {
        return NextResponse.json({ error: logged.error }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, review: inserted.data });
}
