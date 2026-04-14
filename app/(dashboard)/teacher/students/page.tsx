import { TeacherStudentsTable } from "@/components/teacher/teacher-students-table";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import { fetchInternalApi } from "@/lib/server/internal-fetch";

export default async function TeacherStudentsPage() {
  const res = await fetchInternalApi("/api/teacher/students");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">
          {err.error ?? `Lỗi ${res.status}`}
        </p>
      </div>
    );
  }

  const body = (await res.json()) as { students?: TeacherStudentRow[] };
  const students = body.students ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Học sinh
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Danh sách học sinh và tiến độ lộ trình (bài học được giao).
        </p>
      </div>
      <TeacherStudentsTable students={students} />
    </div>
  );
}
