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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Report } from "@/types/database";
import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Row = Report & { reporter_name?: string | null };

type Props = { initialRows: Row[] };

function statusVariant(
  s: string
): "default" | "secondary" | "success" | "destructive" | "outline" {
  if (s === "resolved") return "success";
  if (s === "rejected") return "destructive";
  return "secondary";
}

export function AdminReportsTable({ initialRows }: Props) {
  const router = useRouter();
  const [actionId, setActionId] = useState<{
    id: string;
    kind: "resolved" | "rejected";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!actionId) return;
    const fd = new FormData(e.currentTarget);
    const note = String(fd.get("admin_note") ?? "").trim();
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${actionId.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionId.kind === "resolved" ? "resolved" : "rejected",
          admin_note: note || null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Lỗi");
        return;
      }
      toast.success("Đã cập nhật");
      setActionId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (initialRows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Flag className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Không có báo cáo nào.</p>
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
              <TableHead>Người gửi</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[140px] text-sm font-medium text-foreground">
                  {r.reporter_name ?? r.user_id.slice(0, 8) + "…"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {r.type ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2 text-sm">{r.description}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)} className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => setActionId({ id: r.id, kind: "resolved" })}
                      >
                        Đã xử lý
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading}
                        onClick={() => setActionId({ id: r.id, kind: "rejected" })}
                      >
                        Từ chối
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!actionId} onOpenChange={(o) => !o && setActionId(null)}>
        <DialogContent>
          <form onSubmit={(e) => void submitNote(e)}>
            <DialogHeader>
              <DialogTitle>
                {actionId?.kind === "resolved" ? "Đánh dấu đã xử lý" : "Từ chối báo cáo"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 py-3">
              <Label htmlFor="note">Ghi chú (tuỳ chọn)</Label>
              <Textarea id="note" name="admin_note" rows={3} placeholder="Ghi chú nội bộ..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActionId(null)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={loading}>
                Xác nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
