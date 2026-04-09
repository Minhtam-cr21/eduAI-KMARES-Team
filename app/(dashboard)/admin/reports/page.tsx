import { AdminReportsTable } from "@/components/admin/admin-reports-table";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import { createClient } from "@/lib/supabase/server";
import type { Report } from "@/types/database";
import Link from "next/link";

type Row = Report & { reporter_name?: string | null };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status;
  const q =
    status && ["pending", "resolved", "rejected"].includes(status)
      ? `?status=${encodeURIComponent(status)}`
      : "";

  const res = await fetchInternalApi(`/api/reports/admin${q}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">{err.error ?? "Lỗi tải dữ liệu"}</p>
      </div>
    );
  }

  const raw = (await res.json()) as Report[];
  const ids = Array.from(new Set(raw.map((r) => r.user_id)));
  const names: Record<string, string | null> = {};
  if (ids.length > 0) {
    const supabase = createClient();
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of profs ?? []) {
      names[p.id as string] = (p.full_name as string | null) ?? null;
    }
  }

  const initialRows: Row[] = raw.map((r) => ({
    ...r,
    reporter_name: names[r.user_id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Báo cáo sự cố</h1>
          <p className="text-muted-foreground text-sm">
            Cập nhật trạng thái xử lý báo cáo từ người dùng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterLink href="/admin/reports" active={!status}>
            Tất cả
          </FilterLink>
          <FilterLink href="/admin/reports?status=pending" active={status === "pending"}>
            Chờ xử lý
          </FilterLink>
          <FilterLink href="/admin/reports?status=resolved" active={status === "resolved"}>
            Đã xử lý
          </FilterLink>
          <FilterLink href="/admin/reports?status=rejected" active={status === "rejected"}>
            Từ chối
          </FilterLink>
        </div>
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground w-full text-sm underline-offset-4 hover:underline sm:w-auto"
        >
          ← Tổng quan
        </Link>
      </div>
      <AdminReportsTable initialRows={initialRows} />
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
          : "bg-muted text-muted-foreground hover:bg-muted/80 rounded-md px-3 py-1.5 text-sm"
      }
    >
      {children}
    </Link>
  );
}
