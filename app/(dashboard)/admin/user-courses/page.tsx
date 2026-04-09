import {
  AdminUserCoursesTable,
  type AdminUserCourseRow,
} from "@/components/admin/admin-user-courses-table";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import Link from "next/link";

export default async function AdminUserCoursesPage() {
  const res = await fetchInternalApi("/api/admin/user-courses");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">{err.error ?? "Lỗi tải dữ liệu"}</p>
      </div>
    );
  }

  const body = (await res.json()) as { rows: AdminUserCourseRow[] };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Đăng ký khóa học</h1>
          <p className="text-muted-foreground text-sm">
            Đồng bộ bài học (user_course_progress) sau khi học sinh đăng ký.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Tổng quan
        </Link>
      </div>
      <AdminUserCoursesTable initialRows={body.rows} />
    </div>
  );
}
