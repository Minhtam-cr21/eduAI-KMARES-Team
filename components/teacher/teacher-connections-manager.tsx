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

export type ConnectionRow = {
  id: string;
  student_id: string;
  goal: string;
  available_time: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  student_name: string | null;
};

type Props = { initialRows: ConnectionRow[] };

export function TeacherConnectionsManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const responding = rows.find((r) => r.id === respondId);

  async function submitAccept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!respondId) return;
    const fd = new FormData(e.currentTarget);
    const link = String(fd.get("teacher_response") ?? "").trim();
    if (!link) {
      toast.error("Nhập link liên hệ (Zalo/Meet/…).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${respondId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          teacher_response: link,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không gửi được");
        return;
      }
      toast.success("Đã chấp nhận");
      setRespondId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function confirmReject() {
    if (!rejectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${rejectId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          teacher_response: null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
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
              <TableHead>Học sinh</TableHead>
              <TableHead>Mục tiêu</TableHead>
              <TableHead>Thời gian rảnh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Chưa có yêu cầu.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.student_name ?? r.student_id}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-3 text-sm">{r.goal}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.available_time ?? "—"}
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => setRespondId(r.id)}
                        >
                          Chấp nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectId(r.id)}
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

      <Dialog open={!!respondId} onOpenChange={(o) => !o && setRespondId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấp nhận kết nối</DialogTitle>
          </DialogHeader>
          {responding ? (
            <form onSubmit={(e) => void submitAccept(e)} className="space-y-3">
              <p className="text-muted-foreground text-sm">{responding.goal}</p>
              <div>
                <Label htmlFor="link">Link liên hệ (Zalo / Meet / …)</Label>
                <Input
                  id="link"
                  name="teacher_response"
                  required
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRespondId(null)}>
                  Huỷ
                </Button>
                <Button type="submit" disabled={loading}>
                  Gửi
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => void confirmReject()}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
