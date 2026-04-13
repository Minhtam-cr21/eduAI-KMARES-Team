"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { Search, UsersRound } from "lucide-react";
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
  assessment_completed: boolean | null;
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

const ROLE_BADGE: Record<string, string> = {
  student: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  teacher: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  admin: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400",
};

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
        <form className="flex flex-wrap gap-2" action="/admin/users" method="get">
          <input type="hidden" name="page" value="1" />
          {roleFilter ? <input type="hidden" name="role" value={roleFilter} /> : null}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên..."
              className="h-8 min-w-[200px] pl-8"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Tìm
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Vai trò:</span>
          <Select
            value={roleFilter || "all"}
            onValueChange={(v) => pushQuery({ role: v === "all" ? "" : v, page: "1" })}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {initialRows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <UsersRound className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Không có người dùng.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>MBTI</TableHead>
                <TableHead>Trắc nghiệm</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Đổi role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">
                    {u.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-semibold capitalize", ROLE_BADGE[u.role] ?? "")}
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.mbti_type ? (
                      <Badge className="bg-violet-600 text-[10px] text-white hover:bg-violet-700">
                        {u.mbti_type}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.assessment_completed === true ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-700">
                        Đã làm
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("vi-VN")}
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
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
            ← Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || pending}
            onClick={() => pushQuery({ page: String(page + 1) })}
          >
            Sau →
          </Button>
        </div>
      </div>
    </div>
  );
}
