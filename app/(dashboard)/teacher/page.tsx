import { TeacherDashboardHomeTabs } from "@/components/teacher/teacher-dashboard-home-tabs";
import {
  loadCompletedAssessmentPendingStudents,
  loadTeacherNotifications,
} from "@/lib/teacher/dashboard-home";
import { loadTeacherDashboardStats } from "@/lib/teacher/dashboard-stats";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const stats = await loadTeacherDashboardStats(supabase, user.id);
  const [pendingStudents, notifications] = await Promise.all([
    loadCompletedAssessmentPendingStudents(supabase),
    loadTeacherNotifications(supabase, user.id),
  ]);

  return (
    <TeacherDashboardHomeTabs
      stats={stats}
      initialPendingStudents={pendingStudents}
      initialNotifications={notifications}
    />
  );
}
