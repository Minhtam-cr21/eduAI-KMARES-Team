import {
  AdminPendingCoursesTable,
  type PendingCourseRow,
} from "@/components/admin/admin-pending-courses-table";
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Duyệt khóa học</h1>
          <p className="text-muted-foreground text-sm">
            Các khóa ở trạng thái pending.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Tổng quan
        </Link>
      </div>
      <AdminPendingCoursesTable initialRows={initialRows} />
    </div>
  );
}
