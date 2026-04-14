import type { SupabaseClient } from "@supabase/supabase-js";
import { touchLastActivity } from "@/lib/user/record-activity";

export type CompleteScheduleResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** Đánh dấu một dòng study_schedule là completed (RLS: user phải là chủ). */
export async function completeStudyScheduleItem(
  supabase: SupabaseClient,
  userId: string,
  scheduleId: string
): Promise<CompleteScheduleResult> {
  const { data: row, error: fetchErr } = await supabase
    .from("study_schedule")
    .select("id, user_id, status")
    .eq("id", scheduleId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, status: 500, error: fetchErr.message };
  }
  if (!row || row.user_id !== userId) {
    return { ok: false, status: 404, error: "Not found" };
  }

  if (row.status === "frozen") {
    return {
      ok: false,
      status: 400,
      error: "Mục này đang đóng băng. Liên hệ giáo viên.",
    };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("study_schedule")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", scheduleId);

  if (upErr) {
    return { ok: false, status: 500, error: upErr.message };
  }

  await touchLastActivity(supabase, userId);
  return { ok: true };
}
