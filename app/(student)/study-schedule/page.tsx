import { StudyScheduleClient } from "@/app/(student)/study-schedule/study-schedule-client";
import { createClient } from "@/lib/supabase/server";
import { buildEnrichedScheduleSnapshot } from "@/lib/study-schedule/snapshot";

export default async function StudySchedulePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <StudyScheduleClient
        initialItems={[]}
        initialSummary={null}
        initialAnalysis={null}
      />
    );
  }

  const { data: rows } = await supabase
    .from("study_schedule")
    .select("id, due_date, status, miss_count, completed_at, path_id, lesson_id")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  const snapshot = await buildEnrichedScheduleSnapshot(supabase, rows ?? [], {
    studentId: user.id,
  });

  return (
    <StudyScheduleClient
      initialItems={snapshot.data.items}
      initialSummary={snapshot.data.summary}
      initialAnalysis={snapshot.data.analysis}
    />
  );
}
