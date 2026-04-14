"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export type AdminCourseRow = {
  id: string;
  title: string;
  category: string | null;
  teacher_id: string | null;
  status: string | null;
  is_published?: boolean | null;
  created_at: string;
  teacher?: { full_name: string | null } | null;
};

export function AdminCoursesTable({
  initialRows,
}: {
  initialRows: unknown[];
}) {
  const router = useRouter();
  const rows = initialRows as AdminCourseRow[];
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this course and related data permanently?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không xóa được");
        return;
      }
      toast.success("Đã xóa khóa học");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Danh mục</TableHead>
            <TableHead>Giáo viên</TableHead>
            <TableHead>Hiển thị</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Không có khóa học.
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.title}</TableCell>
              <TableCell>{c.category ?? "—"}</TableCell>
              <TableCell>{c.teacher?.full_name ?? c.teacher_id ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={c.is_published !== false ? "default" : "secondary"}>
                  {c.is_published !== false ? "Public" : "Hidden"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loadingId === c.id}
                  onClick={() => void remove(c.id)}
                >
                  Xóa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
