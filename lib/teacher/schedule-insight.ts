import { buildEnrichedScheduleSnapshot } from "@/lib/study-schedule/snapshot";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadTeacherStudentScheduleSnapshot(
  supabase: SupabaseClient,
  studentId: string
): Promise<{
  student: { id: string; full_name: string | null } | null;
  items: Awaited<
    ReturnType<typeof buildEnrichedScheduleSnapshot>
  >["data"]["items"];
  summary: Awaited<
    ReturnType<typeof buildEnrichedScheduleSnapshot>
  >["data"]["summary"];
  analysis: Awaited<
    ReturnType<typeof buildEnrichedScheduleSnapshot>
  >["data"]["analysis"];
  error?: string;
  status?: number;
}> {
  const emptySnapshot = await buildEnrichedScheduleSnapshot(supabase, [], {
    studentId,
  });

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", studentId)
    .maybeSingle();

  if (profileErr) {
    return {
      student: null,
      items: [],
      summary: emptySnapshot.data.summary,
      analysis: emptySnapshot.data.analysis,
      error: profileErr.message,
      status: 500,
    };
  }

  if (!profile || profile.role !== "student") {
    return {
      student: null,
      items: [],
      summary: emptySnapshot.data.summary,
      analysis: emptySnapshot.data.analysis,
      error: "Không tìm thấy học sinh.",
      status: 404,
    };
  }

  const { data: rows, error } = await supabase
    .from("study_schedule")
    .select(
      "id, due_date, status, miss_count, completed_at, path_id, lesson_id"
    )
    .eq("user_id", studentId)
    .order("due_date", { ascending: true });

  if (error) {
    return {
      student: null,
      items: [],
      summary: emptySnapshot.data.summary,
      analysis: emptySnapshot.data.analysis,
      error: error.message,
      status: 500,
    };
  }
  const snapshot = await buildEnrichedScheduleSnapshot(supabase, rows ?? [], {
    studentId,
  });
  if (snapshot.error) {
    return {
      student: null,
      items: [],
      summary: emptySnapshot.data.summary,
      analysis: emptySnapshot.data.analysis,
      error: snapshot.error,
      status: 500,
    };
  }

  return {
    student: {
      id: profile.id as string,
      full_name: (profile.full_name as string | null) ?? null,
    },
    items: snapshot.data.items,
    summary: snapshot.data.summary,
    analysis: snapshot.data.analysis,
  };
}
