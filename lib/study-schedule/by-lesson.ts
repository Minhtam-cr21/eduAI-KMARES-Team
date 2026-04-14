import type { SupabaseClient } from "@supabase/supabase-js";

export type ScheduleByLessonPayload = {
  schedule_id: string | null;
  status: string | null;
  schedule: { id: string; status: string } | null;
};

export function pickPreferredScheduleRow(
  rows: { id: string; status: string }[]
): ScheduleByLessonPayload {
  const list = rows ?? [];
  const pending = list.find((r) => r.status === "pending");
  const completed = list.find((r) => r.status === "completed");
  const chosen = pending ?? completed ?? list[0] ?? null;
  if (!chosen) {
    return { schedule_id: null, status: null, schedule: null };
  }
  const id = String(chosen.id);
  const st = String(chosen.status);
  return {
    schedule_id: id,
    status: st,
    schedule: { id, status: st },
  };
}

export async function fetchStudyScheduleByLesson(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string
): Promise<{ error: string | null; payload: ScheduleByLessonPayload }> {
  const { data: rows, error } = await supabase
    .from("study_schedule")
    .select("id, status")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message, payload: pickPreferredScheduleRow([]) };
  }
  return { error: null, payload: pickPreferredScheduleRow(rows ?? []) };
}
