"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export type AdminUserCourseRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  student_name: string | null;
  course_title: string | null;
};

type Props = { initialRows: AdminUserCourseRow[] };

export function AdminUserCoursesTable({ initialRows }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null);

  async function sync(userCourseId: string) {
    setSyncing(userCourseId);
    try {
      const res = await fetch("/api/admin/sync-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCourseId }),
      });
      const j = (await res.json()) as {
        error?: string;
        created?: number;
        message?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Đồng bộ thất bại");
        return;
      }
      toast.success(
        j.message ??
          `Đã đồng bộ: ${j.created ?? 0} bài học vào lộ trình`
      );
      router.refresh();
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học sinh</TableHead>
            <TableHead>Khóa học</TableHead>
            <TableHead>Ngày đăng ký</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Chưa có đăng ký nào.
              </TableCell>
            </TableRow>
          ) : (
            initialRows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.student_name ?? r.user_id.slice(0, 8)}</TableCell>
                <TableCell>{r.course_title ?? r.course_id}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(r.enrolled_at).toLocaleString("vi-VN")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    disabled={syncing === r.id}
                    onClick={() => void sync(r.id)}
                  >
                    {syncing === r.id ? "Đang đồng bộ…" : "Đồng bộ lộ trình"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
