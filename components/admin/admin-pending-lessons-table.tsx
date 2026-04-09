"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type PendingLessonRow = {
  id: string;
  title: string;
  order_index: number | null;
  created_at: string;
  course?: {
    id?: string;
    title?: string | null;
    teacher_id?: string | null;
    status?: string | null;
  } | null;
};

type Props = {
  initialRows: PendingLessonRow[];
  teacherNames: Record<string, string | null>;
};

export function AdminPendingLessonsTable({
  initialRows,
  teacherNames,
}: Props) {
  const router = useRouter();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState(teacherNames);

  useEffect(() => {
    setNames(teacherNames);
  }, [teacherNames]);

  async function approve(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/course-lessons/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", rejection_reason: null }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Lỗi");
        return;
      }
      toast.success("Đã duyệt bài học");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function submitReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rejectId) return;
    const fd = new FormData(e.currentTarget);
    const reason = String(fd.get("rejection_reason") ?? "").trim();
    if (!reason) {
      toast.error("Nhập lý do từ chối.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/course-lessons/${rejectId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Lỗi");
        return;
      }
      toast.success("Đã từ chối");
      setRejectId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề bài</TableHead>
              <TableHead>Khóa học</TableHead>
              <TableHead>Giáo viên</TableHead>
              <TableHead>Thứ tự</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Không có bài học chờ duyệt.
                </TableCell>
              </TableRow>
            ) : (
              initialRows.map((row) => {
                const tid = row.course?.teacher_id ?? "";
                return (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-xs font-medium">
                      <span className="line-clamp-2">{row.title}</span>
                    </TableCell>
                    <TableCell>{row.course?.title ?? "—"}</TableCell>
                    <TableCell>{tid ? names[tid] ?? tid.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="tabular-nums">{row.order_index ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(row.created_at).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          disabled={loading}
                          onClick={() => void approve(row.id)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={loading}
                          onClick={() => setRejectId(row.id)}
                        >
                          Từ chối
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <form onSubmit={(e) => void submitReject(e)}>
            <DialogHeader>
              <DialogTitle>Từ chối bài học</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="lr">Lý do</Label>
              <Input
                id="lr"
                name="rejection_reason"
                required
                className="mt-1"
                placeholder="Nhập lý do..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectId(null)}>
                Huỷ
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                Gửi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
