import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompletedAssessmentPendingStudent } from "@/lib/types/teacher";

export type TeacherNotificationRow = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export async function loadCompletedAssessmentPendingStudents(
  supabase: SupabaseClient
): Promise<CompletedAssessmentPendingStudent[]> {
  const { data, error } = await supabase.rpc(
    "teacher_students_completed_assessment_pending_path"
  );
  if (error || !Array.isArray(data)) {
    return [];
  }
  return data as CompletedAssessmentPendingStudent[];
}

export async function loadTeacherNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<TeacherNotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, content, link, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data as TeacherNotificationRow[];
}
