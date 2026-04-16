import { TeacherScheduleInsightsClient } from "@/components/teacher/teacher-schedule-insights-client";
import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import { isRuntimeEnvError } from "@/lib/runtime/env";
import { loadTeacherStudentsList } from "@/lib/teacher/students";

export const dynamic = "force-dynamic";

export default async function TeacherScheduleInsightsPage() {
  let gate: Awaited<ReturnType<typeof requireTeacherOrAdmin>>;
  try {
    gate = await requireTeacherOrAdmin("/teacher/schedule-insights");
  } catch (error) {
    if (isRuntimeEnvError(error)) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const initialStudents = (await loadTeacherStudentsList(gate.supabase)).data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Lịch học & can thiệp
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          Đọc weekly schedule analysis, recommendation và lưu review can thiệp cho từng
          học sinh. Đây là surface hỗ trợ intervention workflow, không thay teacher
          workspace theo học sinh.
        </p>
      </div>
      <TeacherScheduleInsightsClient initialStudents={initialStudents} />
    </div>
  );
}
