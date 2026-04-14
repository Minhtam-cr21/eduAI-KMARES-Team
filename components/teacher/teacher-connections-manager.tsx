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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type ConnectionRow = {
  id: string;
  student_id: string;
  goal: string;
  reason: string | null;
  desired_roadmap: string | null;
  available_time: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  teacher_response: string | null;
  student_name: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  accepted:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
};

type Props = { initialRows: ConnectionRow[] };

type RejectCtx = { id: string; fromAccepted: boolean };

export function TeacherConnectionsManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [rejectCtx, setRejectCtx] = useState<RejectCtx | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [editLinkId, setEditLinkId] = useState<string | null>(null);
  const [editLinkValue, setEditLinkValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const responding = rows.find((r) => r.id === respondId);
  const editing = rows.find((r) => r.id === editLinkId);
  const deleting = rows.find((r) => r.id === deleteId);

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

  async function submitReject() {
    if (!rejectCtx) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${rejectCtx.id}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          teacher_response: rejectNote.trim() || null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      toast.success(
        rejectCtx.fromAccepted ? "Đã chuyển sang từ chối" : "Đã từ chối"
      );
      setRejectCtx(null);
      setRejectNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function submitEditLink(e: React.FormEvent) {
    e.preventDefault();
    if (!editLinkId) return;
    const link = editLinkValue.trim();
    if (!link) {
      toast.error("Nhập link liên hệ.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${editLinkId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted", teacher_response: link }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      toast.success("Đã cập nhật link");
      setEditLinkId(null);
      setEditLinkValue("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${deleteId}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không xóa được");
        return;
      }
      toast.success("Đã xóa yêu cầu");
      setDeleteId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function openEditLink(r: ConnectionRow) {
    setEditLinkId(r.id);
    setEditLinkValue(r.teacher_response?.trim() ?? "");
  }

  return (
    <div className="space-y-6">
      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Chưa có yêu cầu kết nối.
            </p>
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

                {r.reason ? (
                  <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Lý do: </span>
                    <span className="whitespace-pre-wrap">{r.reason}</span>
                  </div>
                ) : null}

                {r.desired_roadmap ? (
                  <div className="rounded-md border border-border/60 p-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Lộ trình mong muốn:{" "}
                    </span>
                    <span className="whitespace-pre-wrap">{r.desired_roadmap}</span>
                  </div>
                ) : null}

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

                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => setRespondId(r.id)}>
                        Chấp nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRejectNote("");
                          setRejectCtx({ id: r.id, fromAccepted: false });
                        }}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {r.status === "accepted" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditLink(r)}
                      >
                        Sửa link
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRejectNote("");
                          setRejectCtx({ id: r.id, fromAccepted: true });
                        }}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                <Input
                  id="link"
                  name="teacher_response"
                  required
                  placeholder="https://..."
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

      <Dialog
        open={!!rejectCtx}
        onOpenChange={(o) => {
          if (!o) {
            setRejectCtx(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectCtx?.fromAccepted
                ? "Từ chối sau khi đã chấp nhận?"
                : "Từ chối yêu cầu?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {rejectCtx?.fromAccepted
              ? "Học sinh sẽ thấy trạng thái từ chối. Có thể ghi lý do (tuỳ chọn)."
              : "Yêu cầu sẽ được đánh dấu rejected. Có thể ghi lý do (tuỳ chọn)."}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Lý do (tuỳ chọn)</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Ví dụ: Lịch đã kín…"
              className="min-h-[72px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectCtx(null);
                setRejectNote("");
              }}
            >
              Huỷ
            </Button>
            <Button variant="destructive" disabled={loading} onClick={() => void submitReject()}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editLinkId}
        onOpenChange={(o) => {
          if (!o) {
            setEditLinkId(null);
            setEditLinkValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa link liên hệ</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={(e) => void submitEditLink(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-link">Link mới</Label>
                <Input
                  id="edit-link"
                  value={editLinkValue}
                  onChange={(e) => setEditLinkValue(e.target.value)}
                  required
                  placeholder="https://..."
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditLinkId(null);
                    setEditLinkValue("");
                  }}
                >
                  Huỷ
                </Button>
                <Button type="submit" disabled={loading}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa yêu cầu kết nối?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting ? (
              <>
                Học sinh <strong>{deleting.student_name ?? deleting.student_id}</strong>{" "}
                sẽ không còn thấy yêu cầu này. Thao tác không hoàn tác.
              </>
            ) : null}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" disabled={loading} onClick={() => void confirmDelete()}>
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
