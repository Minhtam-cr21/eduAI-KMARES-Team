"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  mbti_type: string | null;
  mbti_last_test: string | null;
};

type Props = {
  initialRows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  roleFilter: string;
};

const roles = ["student", "teacher", "admin"] as const;

export function AdminUsersTable({
  initialRows,
  total,
  page,
  pageSize,
  q,
  roleFilter,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [roleSaving, setRoleSaving] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pushQuery = useCallback(
    (next: Record<string, string>) => {
      const p = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [k, v] of Object.entries(next)) {
        if (v === "") p.delete(k);
        else p.set(k, v);
      }
      startTransition(() => {
        router.push(`/admin/users?${p.toString()}`);
      });
    },
    [router, searchParams]
  );

  async function updateRole(userId: string, role: string) {
    setRoleSaving(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      toast.success("Đã cập nhật vai trò");
      router.refresh();
    } finally {
      setRoleSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex flex-wrap gap-2"
          action="/admin/users"
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          {roleFilter ? (
            <input type="hidden" name="role" value={roleFilter} />
          ) : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tên..."
            className="border-input bg-background h-8 min-w-[200px] rounded-md border px-2 text-sm"
          />
          <Button type="submit" size="sm" variant="secondary">
            Tìm
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Vai trò:</span>
          <Select
            value={roleFilter || "all"}
            onValueChange={(v) =>
              pushQuery({ role: v === "all" ? "" : v, page: "1" })
            }
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="student">student</SelectItem>
              <SelectItem value="teacher">teacher</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>MBTI</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Đổi role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Không có người dùng.
                </TableCell>
              </TableRow>
            ) : (
              initialRows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.mbti_type ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(u.created_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={u.role}
                      disabled={roleSaving === u.id || pending}
                      onValueChange={(v) => void updateRole(u.id, v)}
                    >
                      <SelectTrigger className="ml-auto h-8 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {total} người — trang {page} / {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || pending}
            onClick={() => pushQuery({ page: String(page - 1) })}
          >
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || pending}
            onClick={() => pushQuery({ page: String(page + 1) })}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
