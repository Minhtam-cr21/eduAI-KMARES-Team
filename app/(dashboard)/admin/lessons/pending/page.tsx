import {
  AdminPendingLessonsTable,
  type PendingLessonRow,
} from "@/components/admin/admin-pending-lessons-table";
import { BackButton } from "@/components/ui/back-button";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminPendingLessonsPage() {
  const res = await fetchInternalApi("/api/course-lessons/pending");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">{err.error ?? "Lỗi tải dữ liệu"}</p>
      </div>
    );
  }

  const initialRows = (await res.json()) as PendingLessonRow[];
  const teacherIds = Array.from(
    new Set(
      initialRows
        .map((r) => r.course?.teacher_id)
        .filter((x): x is string => !!x)
    )
  );

  const teacherNames: Record<string, string | null> = {};
  if (teacherIds.length > 0) {
    const supabase = createClient();
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);
    for (const p of profs ?? []) {
      teacherNames[p.id as string] = (p.full_name as string | null) ?? null;
    }
  }

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/admin" className="mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Duyệt bài học (khóa học)</h1>
          <p className="text-muted-foreground text-sm">
            Các bài trong course_lessons đang chờ duyệt.
          </p>
        </div>
      </div>
      <AdminPendingLessonsTable
        initialRows={initialRows}
        teacherNames={teacherNames}
      />
    </div>
  );
}
