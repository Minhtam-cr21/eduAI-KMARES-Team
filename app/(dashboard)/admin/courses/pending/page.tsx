import {
  AdminPendingCoursesTable,
  type PendingCourseRow,
} from "@/components/admin/admin-pending-courses-table";
import { BackButton } from "@/components/ui/back-button";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import Link from "next/link";

export default async function AdminPendingCoursesPage() {
  const res = await fetchInternalApi("/api/courses/pending");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">{err.error ?? "Lỗi tải dữ liệu"}</p>
      </div>
    );
  }

  const initialRows = (await res.json()) as PendingCourseRow[];

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/admin" className="mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Duyệt khóa học</h1>
          <p className="text-muted-foreground text-sm">
            Các khóa ở trạng thái pending.
          </p>
        </div>
      </div>
      <AdminPendingCoursesTable initialRows={initialRows} />
    </div>
  );
}
