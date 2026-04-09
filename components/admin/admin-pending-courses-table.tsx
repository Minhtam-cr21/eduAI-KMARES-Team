"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { BookOpen } from "lucide-react";
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

  if (initialRows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Không có khóa học chờ duyệt.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
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
            {initialRows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-xs">
                  <p className="line-clamp-2 font-medium text-foreground">{c.title}</p>
                  {c.description && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{c.teacher?.full_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{c.course_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{c.category}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" disabled={loading} onClick={() => void approve(c.id)}>
                      Duyệt
                    </Button>
                    <Button size="sm" variant="destructive" disabled={loading} onClick={() => setRejectId(c.id)}>
                      Từ chối
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <form onSubmit={(e) => void submitReject(e)}>
            <DialogHeader>
              <DialogTitle>Từ chối khóa học</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 py-3">
              <Label htmlFor="rej">Lý do từ chối</Label>
              <Input id="rej" name="rejection_reason" required placeholder="Nhập lý do..." />
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
