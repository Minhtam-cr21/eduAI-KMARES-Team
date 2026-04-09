import { AdminUsersTable } from "@/components/admin/admin-users-table";
import type { AdminUserRow } from "@/components/admin/admin-users-table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import Link from "next/link";
import { Suspense } from "react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; role?: string };
}) {
  const sp = searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q = (sp.q || "").trim();
  const roleFilter = (sp.role || "").trim();

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", "20");
  if (q) qs.set("q", q);
  if (roleFilter && ["student", "teacher", "admin"].includes(roleFilter)) {
    qs.set("role", roleFilter);
  }

  const res = await fetchInternalApi(`/api/admin/users?${qs.toString()}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">{err.error ?? "Lỗi tải dữ liệu"}</p>
      </div>
    );
  }

  const body = (await res.json()) as {
    users: AdminUserRow[];
    total: number;
    page: number;
    page_size: number;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Người dùng</h1>
          <p className="text-muted-foreground text-sm">
            Phân trang, tìm kiếm và gán vai trò.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Tổng quan
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <AdminUsersTable
          initialRows={body.users}
          total={body.total}
          page={body.page}
          pageSize={body.page_size}
          q={q}
          roleFilter={roleFilter}
        />
      </Suspense>
    </div>
  );
}
