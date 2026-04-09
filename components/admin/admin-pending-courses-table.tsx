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
import { useState } from "react";
import { toast } from "sonner";

export type PendingCourseRow = {
  id: string;
  title: string;
  description: string | null;
  course_type: string;
  category: string;
  created_at: string;
  teacher?: { id?: string; full_name: string | null; avatar_url?: string | null } | null;
};

type Props = { initialRows: PendingCourseRow[] };

export function AdminPendingCoursesTable({ initialRows }: Props) {
  const router = useRouter();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function approve(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", rejection_reason: null }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Lỗi");
        return;
      }
      toast.success("Đã duyệt khóa học");
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
      const res = await fetch(`/api/courses/${rejectId}/approve`, {
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
              <TableHead>Tên khóa</TableHead>
              <TableHead>Giáo viên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Không có khóa học chờ duyệt.
                </TableCell>
              </TableRow>
            ) : (
              initialRows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-xs font-medium">
                    <span className="line-clamp-2">{c.title}</span>
                  </TableCell>
                  <TableCell>{c.teacher?.full_name ?? "—"}</TableCell>
                  <TableCell>{c.course_type}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(c.created_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => void approve(c.id)}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading}
                        onClick={() => setRejectId(c.id)}
                      >
                        Từ chối
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <form onSubmit={(e) => void submitReject(e)}>
            <DialogHeader>
              <DialogTitle>Từ chối khóa học</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="rej">Lý do</Label>
              <Input
                id="rej"
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
