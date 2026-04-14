import {
  TeacherRoadmapsManager,
  type TeacherRoadmapRow,
} from "@/components/teacher/teacher-roadmaps-manager";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherRoadmapsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: rows } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Roadmap công khai
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Share public paths as markdown or JSON for students (visible at /roadmaps).</p>
      </div>
      <TeacherRoadmapsManager initialRoadmaps={(rows ?? []) as TeacherRoadmapRow[]} />
    </div>
  );
}
