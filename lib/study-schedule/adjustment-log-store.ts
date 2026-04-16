import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createSchemaSyncError,
  type SchemaDependency,
  type SchemaSyncError,
} from "@/lib/supabase/schema-sync";
import type { SchedulePriority, SoftDeadlineLevel } from "./contracts";

type ScheduleAdjustmentLogInsert = {
  user_id: string;
  schedule_item_id?: string | null;
  teacher_id?: string | null;
  path_id?: string | null;
  adjustment_source: "system_policy" | "teacher_override";
  adjustment_level: SoftDeadlineLevel;
  priority_before?: SchedulePriority | null;
  priority_after?: SchedulePriority | null;
  pacing_override?: "slow" | "steady" | "accelerated" | null;
  decision_note?: string | null;
  snapshot: Record<string, unknown>;
};

const SCHEDULE_ADJUSTMENT_LOGS_DEPENDENCY: SchemaDependency = {
  phase: "Upgrade Track 2",
  migrationFile:
    "supabase/migrations/20260416020000_upgrade_track2_schedule_adjustment_logs.sql",
  feature: "smart schedule v2 decision logging",
  relation: "schedule_adjustment_logs",
};

export async function insertScheduleAdjustmentLog(
  supabase: SupabaseClient,
  payload: ScheduleAdjustmentLogInsert
): Promise<{
  error: string | null;
  schemaError: SchemaSyncError | null;
}> {
  const { error } = await supabase.from("schedule_adjustment_logs").insert({
    ...payload,
    schedule_item_id: payload.schedule_item_id ?? null,
    teacher_id: payload.teacher_id ?? null,
    path_id: payload.path_id ?? null,
    priority_before: payload.priority_before ?? null,
    priority_after: payload.priority_after ?? null,
    pacing_override: payload.pacing_override ?? null,
    decision_note: payload.decision_note ?? null,
    snapshot: payload.snapshot,
  });

  const schemaError = error
    ? createSchemaSyncError(error, SCHEDULE_ADJUSTMENT_LOGS_DEPENDENCY)
    : null;

  return {
    error: schemaError?.message ?? error?.message ?? null,
    schemaError,
  };
}
