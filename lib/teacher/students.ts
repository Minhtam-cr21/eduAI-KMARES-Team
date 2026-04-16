import type { SupabaseClient } from "@supabase/supabase-js";

import type { TeacherStudentRow } from "@/lib/types/teacher";

export async function loadTeacherStudentsList(
  supabase: SupabaseClient
): Promise<{
  data: TeacherStudentRow[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("teacher_list_students_with_stats");

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []) as TeacherStudentRow[],
    error: null,
  };
}
