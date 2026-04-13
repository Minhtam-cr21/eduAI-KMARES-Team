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
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
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
  teacher_response: string | null;
  student_name: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  accepted: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
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
        body: JSON.stringify({ status: "accepted", teacher_response: link }),
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
        body: JSON.stringify({ status: "rejected", teacher_response: null }),
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
    <div className="space-y-6">
      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có yêu cầu kết nối.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="transition hover:shadow-md">
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {r.student_name ?? r.student_id.slice(0, 8) + "…"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold capitalize",
                      STATUS_BADGE[r.status] ?? ""
                    )}
                  >
                    {r.status}
                  </Badge>
                </div>

                <p className="line-clamp-3 text-sm text-foreground">{r.goal}</p>

                {r.available_time && (
                  <p className="text-xs text-muted-foreground">
                    Thời gian rảnh: {r.available_time}
                  </p>
                )}

                {r.status !== "pending" && r.teacher_response ? (
                  <p className="text-xs text-muted-foreground">
                    Đã gửi link/phản hồi:{" "}
                    {/^https?:\/\//i.test(r.teacher_response.trim()) ? (
                      <a
                        href={r.teacher_response.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {r.teacher_response.trim()}
                      </a>
                    ) : (
                      <span className="text-foreground">{r.teacher_response}</span>
                    )}
                  </p>
                ) : null}

                {r.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => setRespondId(r.id)}>
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
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Accept Dialog */}
      <Dialog open={!!respondId} onOpenChange={(o) => !o && setRespondId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấp nhận kết nối</DialogTitle>
          </DialogHeader>
          {responding ? (
            <form onSubmit={(e) => void submitAccept(e)} className="space-y-3">
              <p className="text-sm text-muted-foreground">{responding.goal}</p>
              <div className="space-y-1.5">
                <Label htmlFor="link">Link liên hệ (Zalo / Meet / …)</Label>
                <Input id="link" name="teacher_response" required placeholder="https://..." />
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

      {/* Reject Confirm */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yêu cầu sẽ được đánh dấu là &quot;rejected&quot;. Bạn có chắc?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" disabled={loading} onClick={() => void confirmReject()}>
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
