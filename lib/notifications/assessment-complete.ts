import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Thông báo giáo viên (đã kết nối accepted) và admin khi học sinh hoàn thành trắc nghiệm.
 * Dùng service role để INSERT (RLS không cho authenticated insert).
 */
export async function notifyAssessmentCompletedForStudent(args: {
  studentId: string;
  studentDisplayName: string;
}): Promise<void> {
  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    console.warn(
      "[notifyAssessmentCompletedForStudent] bỏ qua (thiếu service role):",
      e instanceof Error ? e.message : e
    );
    return;
  }

  const { data: accepted, error: crErr } = await admin
    .from("connection_requests")
    .select("teacher_id")
    .eq("student_id", args.studentId)
    .eq("status", "accepted");

  if (crErr) {
    console.error("[notifyAssessmentCompletedForStudent] connection_requests:", crErr.message);
  }

  const teacherIds = new Set<string>();
  for (const row of accepted ?? []) {
    const tid = row.teacher_id as string | null;
    if (tid) teacherIds.add(tid);
  }

  const { data: admins, error: adErr } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (adErr) {
    console.error("[notifyAssessmentCompletedForStudent] admins:", adErr.message);
  }

  for (const row of admins ?? []) {
    teacherIds.add(row.id as string);
  }

  if (teacherIds.size === 0) return;

  const content = `${args.studentDisplayName} đã hoàn thành trắc nghiệm định hướng. Hãy tạo lộ trình cá nhân hóa.`;
  const rows = Array.from(teacherIds).map((user_id) => ({
    user_id,
    type: "assessment_completed",
    title: "Học sinh vừa hoàn thành bài test",
    content,
    link: `/teacher/personalized-paths/${args.studentId}`,
  }));

  const { error: insErr } = await admin.from("notifications").insert(rows);
  if (insErr) {
    console.error("[notifyAssessmentCompletedForStudent] insert:", insErr.message);
  }
}
