import { AdminCoursesTable } from "@/components/admin/admin-courses-table";
import { fetchInternalApi } from "@/lib/server/internal-fetch";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const res = await fetchInternalApi("/api/admin/courses");
  const rows = res.ok ? ((await res.json()) as unknown[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Khóa học</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All courses. Delete only for policy violations — cannot be undone.
        </p>
      </div>
      <AdminCoursesTable initialRows={rows} />
    </div>
  );
}
