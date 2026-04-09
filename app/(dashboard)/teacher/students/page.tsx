import { TeacherStudentsTable } from "@/components/teacher/teacher-students-table";
import { BackButton } from "@/components/ui/back-button";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import Link from "next/link";

export default async function TeacherStudentsPage() {
  const res = await fetchInternalApi("/api/teacher/students");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-destructive text-sm">
          {err.error ?? `Lỗi ${res.status}`}
        </p>
      </div>
    );
  }

  const body = (await res.json()) as { students?: TeacherStudentRow[] };
  const students = body.students ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <BackButton fallbackHref="/teacher" className="mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Học sinh</h1>
          <p className="text-muted-foreground text-sm">
            Danh sách học sinh và tiến độ lộ trình (bài học được giao).
          </p>
        </div>
      </div>
      <TeacherStudentsTable students={students} />
    </div>
  );
}
