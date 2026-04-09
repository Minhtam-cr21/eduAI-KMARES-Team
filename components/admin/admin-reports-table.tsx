"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Report } from "@/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Row = Report & { reporter_name?: string | null };

type Props = { initialRows: Row[] };

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

  function statusVariant(
    s: string
  ): "default" | "secondary" | "success" | "destructive" | "outline" {
    if (s === "resolved") return "success";
    if (s === "rejected") return "destructive";
    return "secondary";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border">
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
            {initialRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Không có báo cáo.
                </TableCell>
              </TableRow>
            ) : (
              initialRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[140px] text-sm">
                    {r.reporter_name ?? r.user_id.slice(0, 8) + "…"}
                  </TableCell>
                  <TableCell>{r.type ?? "—"}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-3 text-sm">{r.description}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          disabled={loading}
                          onClick={() =>
                            setActionId({ id: r.id, kind: "resolved" })
                          }
                        >
                          Đã xử lý
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={loading}
                          onClick={() =>
                            setActionId({ id: r.id, kind: "rejected" })
                          }
                        >
                          Từ chối
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!actionId} onOpenChange={(o) => !o && setActionId(null)}>
        <DialogContent>
          <form onSubmit={(e) => void submitNote(e)}>
            <DialogHeader>
              <DialogTitle>
                {actionId?.kind === "resolved"
                  ? "Đánh dấu đã xử lý"
                  : "Từ chối báo cáo"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="note">Ghi chú (tuỳ chọn)</Label>
              <Textarea
                id="note"
                name="admin_note"
                className="mt-1"
                rows={3}
                placeholder="Ghi chú nội bộ..."
              />
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
