import { TeacherStudentsTable } from "@/components/teacher/teacher-students-table";
import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import { isRuntimeEnvError } from "@/lib/runtime/env";
import { loadTeacherStudentsList } from "@/lib/teacher/students";

export default async function TeacherStudentsPage() {
  let gate: Awaited<ReturnType<typeof requireTeacherOrAdmin>>;
  try {
    gate = await requireTeacherOrAdmin("/teacher/students");
  } catch (error) {
    if (isRuntimeEnvError(error)) {
      return (
        <div>
          <p className="text-destructive text-sm">{error.message}</p>
        </div>
      );
    }
    throw error;
  }

  const { data: students, error } = await loadTeacherStudentsList(gate.supabase);
  if (error) {
    return (
      <div>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Học sinh
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Chọn một học sinh để mở intervention workspace: assessment, path, schedule,
          recommendations, review history và action panel.
        </p>
      </div>
      <TeacherStudentsTable students={students} />
    </div>
  );
}
