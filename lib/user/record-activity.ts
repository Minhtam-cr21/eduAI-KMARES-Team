import type { SupabaseClient } from "@supabase/supabase-js";

/** Cập nhật last_activity_at (RLS: user chỉ sửa profile của mình). */
export async function touchLastActivity(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ last_activity_at: now })
    .eq("id", userId);

  if (error) {
    console.warn("[record-activity]", error.message);
  }
}
