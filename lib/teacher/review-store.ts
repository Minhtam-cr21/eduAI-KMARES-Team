import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSchemaSyncError,
  type SchemaDependency,
  type SchemaSyncError,
} from "@/lib/supabase/schema-sync";

type TeacherReviewEventInsert = {
  teacher_id: string;
  student_id: string;
  path_id?: string | null;
  review_kind: "personalized_path" | "schedule_insight";
  review_status: string;
  risk_level?: string | null;
  source?: string | null;
  action_recommendation?: string | null;
  review_note?: string | null;
  adjustment_note?: string | null;
  snapshot: Record<string, unknown>;
};

export type TeacherReviewEventRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  path_id: string | null;
  review_kind: "personalized_path" | "schedule_insight";
  review_status: string;
  risk_level: string | null;
  source: string | null;
  action_recommendation: string | null;
  review_note: string | null;
  adjustment_note: string | null;
  snapshot: unknown;
  created_at: string;
};

const REVIEW_SELECT =
  "id, teacher_id, student_id, path_id, review_kind, review_status, risk_level, source, action_recommendation, review_note, adjustment_note, snapshot, created_at";

const PHASE5_REVIEW_EVENTS_DEPENDENCY: SchemaDependency = {
  phase: "Phase 5",
  migrationFile: "supabase/migrations/20260416010000_phase5_teacher_review_events.sql",
  feature: "teacher review workflow",
  relation: "teacher_review_events",
};

export async function insertTeacherReviewEvent(
  supabase: SupabaseClient,
  payload: TeacherReviewEventInsert
): Promise<{
  data: TeacherReviewEventRow | null;
  error: string | null;
  schemaError: SchemaSyncError | null;
}> {
  const { data, error } = await supabase
    .from("teacher_review_events")
    .insert({
      ...payload,
      path_id: payload.path_id ?? null,
      risk_level: payload.risk_level ?? null,
      source: payload.source ?? null,
      action_recommendation: payload.action_recommendation ?? null,
      review_note: payload.review_note ?? null,
      adjustment_note: payload.adjustment_note ?? null,
      snapshot: payload.snapshot,
    })
    .select(REVIEW_SELECT)
    .maybeSingle();

  const schemaError = error
    ? createSchemaSyncError(error, PHASE5_REVIEW_EVENTS_DEPENDENCY)
    : null;

  return {
    data: (data as TeacherReviewEventRow | null) ?? null,
    error: schemaError?.message ?? error?.message ?? null,
    schemaError,
  };
}

export async function listTeacherReviewEvents(
  supabase: SupabaseClient,
  args: {
    reviewKind: "personalized_path" | "schedule_insight";
    teacherId?: string;
    studentId?: string;
    pathId?: string | null;
    limit?: number;
  }
): Promise<{
  data: TeacherReviewEventRow[];
  error: string | null;
  schemaError: SchemaSyncError | null;
}> {
  let query = supabase
    .from("teacher_review_events")
    .select(REVIEW_SELECT)
    .eq("review_kind", args.reviewKind)
    .order("created_at", { ascending: false });

  if (args.teacherId) query = query.eq("teacher_id", args.teacherId);
  if (args.studentId) query = query.eq("student_id", args.studentId);
  if (args.pathId !== undefined) query = query.eq("path_id", args.pathId);
  if (args.limit) query = query.limit(args.limit);

  const { data, error } = await query;
  const schemaError = error
    ? createSchemaSyncError(error, PHASE5_REVIEW_EVENTS_DEPENDENCY)
    : null;
  return {
    data: (data as TeacherReviewEventRow[] | null) ?? [],
    error: schemaError?.message ?? error?.message ?? null,
    schemaError,
  };
}
