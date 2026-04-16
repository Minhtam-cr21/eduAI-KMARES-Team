import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { teacherPathReviewCreateSchema } from "@/lib/teacher/review-contracts";
import { insertTeacherReviewEvent, listTeacherReviewEvents } from "@/lib/teacher/review-store";
import { schemaSyncErrorResponse } from "@/lib/supabase/schema-sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const WORKFLOW_STATUSES = [
  "draft",
  "pending",
  "pending_student_approval",
  "revision_requested",
] as const;

const postBodySchema = z.object({
  studentId: z.string().uuid(),
  courseSequence: z.array(
    z.object({
      course_id: z.string().uuid(),
      order_index: z.number().int().min(0),
      due_date_offset_days: z.number().int().min(1).optional(),
      recommended_due_date_offset_days: z.number().int().min(1).optional(),
    })
  ),
  status: z.enum(["draft", "pending_student_approval"]),
  reviewStatus: teacherPathReviewCreateSchema.shape.reviewStatus.optional(),
  reviewNote: teacherPathReviewCreateSchema.shape.reviewNote.optional(),
  adjustmentNote: teacherPathReviewCreateSchema.shape.adjustmentNote.optional(),
  suggestionSource: teacherPathReviewCreateSchema.shape.suggestionSource.optional(),
  reasoning: teacherPathReviewCreateSchema.shape.reasoning.optional(),
  learnerSignalsUsed: teacherPathReviewCreateSchema.shape.learnerSignalsUsed.optional(),
  pathStatus: teacherPathReviewCreateSchema.shape.pathStatus.optional(),
});

function normalizeSequence(
  items: z.infer<typeof postBodySchema>["courseSequence"]
) {
  return items
    .map((row, i) => ({
      course_id: row.course_id,
      order_index: row.order_index ?? i,
      due_date_offset_days:
        row.due_date_offset_days ??
        row.recommended_due_date_offset_days ??
        7 * (i + 1),
    }))
    .sort((a, b) => a.order_index - b.order_index);
}

/** GET — danh sách lộ trình cần xử lý (chờ học sinh / chỉnh sửa / nháp). */
export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;

  let q = supabase
    .from("personalized_paths")
    .select("id, student_id, teacher_id, status, updated_at, created_at")
    .in("status", [...WORKFLOW_STATUSES, "active", "paused"]);

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (me?.role !== "admin") {
    q = q.eq("teacher_id", userId);
  }

  const { data, error } = await q.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const paths = data ?? [];
  const studentIds = Array.from(
    new Set(paths.map((p) => p.student_id).filter(Boolean))
  ) as string[];
  const nameById = new Map<string, string | null>();

  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    for (const p of profs ?? []) {
      nameById.set(p.id as string, (p.full_name as string | null) ?? null);
    }
  }

  const rows = paths.map((r) => ({
    id: r.id,
    student_id: r.student_id,
    teacher_id: r.teacher_id,
    status: r.status,
    updated_at: r.updated_at,
    created_at: r.created_at,
    student_name: r.student_id ? nameById.get(r.student_id) ?? null : null,
  }));

  const pathIds = rows.map((row) => row.id as string);
  const reviewResult =
    pathIds.length > 0
      ? await listTeacherReviewEvents(supabase, {
          reviewKind: "personalized_path",
          teacherId: me?.role === "admin" ? undefined : userId,
          limit: 200,
        })
      : { data: [], error: null, schemaError: null };

  if (reviewResult.schemaError) {
    return schemaSyncErrorResponse(reviewResult.schemaError);
  }

  if (reviewResult.error) {
    return NextResponse.json({ error: reviewResult.error }, { status: 500 });
  }

  const latestReviewByPathId = new Map<
    string,
    { review_status: string; created_at: string; source: string | null }
  >();
  for (const review of reviewResult.data) {
    if (!review.path_id || !pathIds.includes(review.path_id)) continue;
    if (latestReviewByPathId.has(review.path_id)) continue;
    latestReviewByPathId.set(review.path_id, {
      review_status: review.review_status,
      created_at: review.created_at,
      source: review.source,
    });
  }

  return NextResponse.json({
    paths: rows.map((row) => ({
      ...row,
      latest_review_status: latestReviewByPathId.get(row.id)?.review_status ?? null,
      latest_reviewed_at: latestReviewByPathId.get(row.id)?.created_at ?? null,
      latest_review_source: latestReviewByPathId.get(row.id)?.source ?? null,
    })),
  });
}

/** POST — tạo mới hoặc cập nhật lộ trình cho học sinh. */
export async function POST(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const course_sequence = normalizeSequence(parsed.data.courseSequence);
  const { studentId, status } = parsed.data;

  const { data: existingList } = await supabase
    .from("personalized_paths")
    .select("id, status")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const editableStatuses = new Set<string>(WORKFLOW_STATUSES);
  const editable = existingList?.find((p) => editableStatuses.has(p.status));

  if (!editable) {
    const hasActive = existingList?.some((p) => p.status === "active");
    if (hasActive) {
      return NextResponse.json(
        {
          error:
            "Học sinh đang có lộ trình active. Chờ góp ý hoặc tạm dừng trước khi tạo bản mới.",
        },
        { status: 409 }
      );
    }
  }

  if (editable) {
    const { data, error } = await supabase
      .from("personalized_paths")
      .update({
        course_sequence,
        status,
        teacher_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editable.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pathId = data?.id ?? editable.id;
    const reviewInsert = await maybeInsertPathReview({
      supabase,
      teacherId: userId,
      studentId,
      pathId,
      reviewStatus:
        parsed.data.reviewStatus ??
        (status === "pending_student_approval" ? "sent_to_student" : "reviewed"),
      reviewNote: parsed.data.reviewNote,
      adjustmentNote: parsed.data.adjustmentNote,
      suggestionSource: parsed.data.suggestionSource,
      reasoning: parsed.data.reasoning,
      learnerSignalsUsed: parsed.data.learnerSignalsUsed,
      pathStatus: status,
      sequenceLength: course_sequence.length,
    });

    if (reviewInsert.error) {
      if (reviewInsert.schemaError) {
        return schemaSyncErrorResponse(reviewInsert.schemaError);
      }
      return NextResponse.json({ error: reviewInsert.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pathId });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("personalized_paths")
    .insert({
      student_id: studentId,
      teacher_id: userId,
      course_sequence,
      status,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const pathId = inserted?.id;
  if (!pathId) {
    return NextResponse.json({ error: "Không tạo được pathId." }, { status: 500 });
  }

  const reviewInsert = await maybeInsertPathReview({
    supabase,
    teacherId: userId,
    studentId,
    pathId,
    reviewStatus:
      parsed.data.reviewStatus ??
      (status === "pending_student_approval" ? "sent_to_student" : "reviewed"),
    reviewNote: parsed.data.reviewNote,
    adjustmentNote: parsed.data.adjustmentNote,
    suggestionSource: parsed.data.suggestionSource,
    reasoning: parsed.data.reasoning,
    learnerSignalsUsed: parsed.data.learnerSignalsUsed,
    pathStatus: status,
    sequenceLength: course_sequence.length,
  });

  if (reviewInsert.error) {
    if (reviewInsert.schemaError) {
      return schemaSyncErrorResponse(reviewInsert.schemaError);
    }
    return NextResponse.json({ error: reviewInsert.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pathId });
}

async function maybeInsertPathReview(args: {
  supabase: SupabaseClient;
  teacherId: string;
  studentId: string;
  pathId: string;
  reviewStatus: z.infer<typeof teacherPathReviewCreateSchema.shape.reviewStatus>;
  reviewNote?: string;
  adjustmentNote?: string;
  suggestionSource?: z.infer<typeof teacherPathReviewCreateSchema.shape.suggestionSource>;
  reasoning?: string;
  learnerSignalsUsed?: z.infer<
    typeof teacherPathReviewCreateSchema.shape.learnerSignalsUsed
  >;
  pathStatus?: string | null;
  sequenceLength: number;
}) {
  if (!args.reasoning && !args.reviewNote && !args.adjustmentNote) {
    return { error: null, schemaError: null };
  }

  const reviewParsed = teacherPathReviewCreateSchema.safeParse({
    pathId: args.pathId,
    studentId: args.studentId,
    reviewStatus: args.reviewStatus,
    reviewNote: args.reviewNote ?? "",
    adjustmentNote: args.adjustmentNote ?? "",
    suggestionSource: args.suggestionSource ?? null,
    reasoning: args.reasoning ?? "Teacher-reviewed personalized path.",
    learnerSignalsUsed: args.learnerSignalsUsed ?? [],
    pathStatus: args.pathStatus ?? null,
    sequenceLength: args.sequenceLength,
  });

  if (!reviewParsed.success) {
    return {
      error: reviewParsed.error.issues[0]?.message ?? "Invalid path review.",
      schemaError: null,
    };
  }

  const inserted = await insertTeacherReviewEvent(args.supabase, {
    teacher_id: args.teacherId,
    student_id: args.studentId,
    path_id: args.pathId,
    review_kind: "personalized_path",
    review_status: reviewParsed.data.reviewStatus,
    source: reviewParsed.data.suggestionSource ?? null,
    review_note: reviewParsed.data.reviewNote || null,
    adjustment_note: reviewParsed.data.adjustmentNote || null,
    snapshot: {
      reasoning: reviewParsed.data.reasoning,
      suggestion_source: reviewParsed.data.suggestionSource ?? null,
      learner_signals_used: reviewParsed.data.learnerSignalsUsed,
      path_status: reviewParsed.data.pathStatus ?? null,
      sequence_length: reviewParsed.data.sequenceLength,
    },
  });

  return { error: inserted.error, schemaError: inserted.schemaError };
}
