"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { motion } from "framer-motion";
import { Loader2, Trash2, Users, Video } from "lucide-react";
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
  meeting_code: string | null;
  meeting_link: string | null;
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

type RejectCtx = {
  connectionId: string;
  student_id: string;
  studentLabel: string;
  fromAccepted: boolean;
};

type PathGateCtx = {
  pathId: string;
  studentLabel: string;
  kind: "reject" | "delete";
  connectionId: string;
  rejectNote?: string | null;
  fromAccepted?: boolean;
};

async function getActiveOrPausedPathId(studentId: string): Promise<string | null> {
  const res = await fetch(
    `/api/personalized-path/teacher/by-student/${encodeURIComponent(studentId)}`
  );
  const j = (await res.json()) as {
    path?: { id: string; status: string } | null;
    error?: string;
  };
  if (!res.ok || !j.path) return null;
  const s = j.path.status;
  if (s === "active" || s === "paused") return j.path.id;
  return null;
}

export function TeacherConnectionsManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [rejectCtx, setRejectCtx] = useState<RejectCtx | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [editLinkId, setEditLinkId] = useState<string | null>(null);
  const [editMeetCode, setEditMeetCode] = useState("");
  const [editMeetLink, setEditMeetLink] = useState("");
  const [editNote, setEditNote] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pathGate, setPathGate] = useState<PathGateCtx | null>(null);
  const [cancelPathWithGate, setCancelPathWithGate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [acceptUseAuto, setAcceptUseAuto] = useState(true);
  const [acceptMeetCode, setAcceptMeetCode] = useState("");
  const [acceptMeetLink, setAcceptMeetLink] = useState("");
  const [acceptNote, setAcceptNote] = useState("");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (pathGate) setCancelPathWithGate(true);
  }, [pathGate]);

  useEffect(() => {
    if (respondId) {
      setAcceptUseAuto(true);
      setAcceptMeetCode("");
      setAcceptMeetLink("");
      setAcceptNote("");
    }
  }, [respondId]);

  const responding = rows.find((r) => r.id === respondId);
  const editing = rows.find((r) => r.id === editLinkId);
  const deleting = rows.find((r) => r.id === deleteId);

  async function runRejectRequest(
    connectionId: string,
    note: string,
    fromAccepted: boolean
  ) {
    const res = await fetch(`/api/connection-requests/${connectionId}/respond`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "rejected",
        teacher_response: note.trim() || null,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error ?? "Không cập nhật được");
      return false;
    }
    toast.success(fromAccepted ? "Đã chuyển sang từ chối" : "Đã từ chối");
    return true;
  }

  async function runDeleteRequest(connectionId: string) {
    const res = await fetch(`/api/connection-requests/${connectionId}`, {
      method: "DELETE",
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error ?? "Không xóa được");
      return false;
    }
    toast.success("Đã xóa yêu cầu");
    return true;
  }

  async function prefetchJitsiForAccept() {
    if (!respondId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/connection-requests/${respondId}/generate-meeting`,
        { method: "POST" }
      );
      const j = (await res.json()) as {
        meeting_code?: string;
        meeting_link?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được phòng");
        return;
      }
      setAcceptUseAuto(false);
      setAcceptMeetCode(j.meeting_code ?? "");
      setAcceptMeetLink(j.meeting_link ?? "");
      toast.success("Đã tạo phòng Jitsi — kiểm tra và gửi");
    } finally {
      setLoading(false);
    }
  }

  async function submitAccept() {
    if (!respondId) return;
    const code = acceptMeetCode.trim();
    const link = acceptMeetLink.trim();
    const note = acceptNote.trim();
    if (
      !acceptUseAuto &&
      !code &&
      !link &&
      !note
    ) {
      toast.error("Chọn tạo phòng tự động, hoặc nhập mã/link/ghi chú.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${respondId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          generate_meeting: acceptUseAuto,
          teacher_response: note || null,
          meeting_code: acceptUseAuto ? null : code || null,
          meeting_link: acceptUseAuto ? null : link || null,
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

  async function submitReject() {
    if (!rejectCtx) return;
    setLoading(true);
    try {
      const pathId = await getActiveOrPausedPathId(rejectCtx.student_id);
      if (pathId) {
        setPathGate({
          pathId,
          studentLabel: rejectCtx.studentLabel,
          kind: "reject",
          connectionId: rejectCtx.connectionId,
          rejectNote: rejectNote.trim() || null,
          fromAccepted: rejectCtx.fromAccepted,
        });
        setRejectCtx(null);
        setRejectNote("");
        return;
      }
      const ok = await runRejectRequest(
        rejectCtx.connectionId,
        rejectNote,
        rejectCtx.fromAccepted
      );
      if (ok) {
        setRejectCtx(null);
        setRejectNote("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function prefetchJitsiForEdit() {
    if (!editLinkId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/connection-requests/${editLinkId}/generate-meeting`,
        { method: "POST" }
      );
      const j = (await res.json()) as {
        meeting_code?: string;
        meeting_link?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được phòng");
        return;
      }
      setEditMeetCode(j.meeting_code ?? "");
      setEditMeetLink(j.meeting_link ?? "");
      toast.success("Đã tạo phòng Jitsi mới");
    } finally {
      setLoading(false);
    }
  }

  async function submitEditMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!editLinkId) return;
    const code = editMeetCode.trim();
    const link = editMeetLink.trim();
    const note = editNote.trim();
    if (!code && !link && !note) {
      toast.error("Nhập mã, link phòng hoặc ghi chú.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/connection-requests/${editLinkId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          generate_meeting: false,
          meeting_code: code || null,
          meeting_link: link || null,
          teacher_response: note || null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      toast.success("Đã cập nhật phòng họp");
      setEditLinkId(null);
      setEditMeetCode("");
      setEditMeetLink("");
      setEditNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const row = rows.find((r) => r.id === deleteId);
    if (!row) return;
    setLoading(true);
    try {
      const pathId = await getActiveOrPausedPathId(row.student_id);
      if (pathId) {
        setPathGate({
          pathId,
          studentLabel: row.student_name ?? row.student_id.slice(0, 8) + "…",
          kind: "delete",
          connectionId: row.id,
        });
        setDeleteId(null);
        return;
      }
      const ok = await runDeleteRequest(row.id);
      if (ok) {
        setDeleteId(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmPathGate() {
    if (!pathGate) return;
    setLoading(true);
    try {
      if (cancelPathWithGate) {
        const cr = await fetch(
          `/api/personalized-path/teacher/${pathGate.pathId}/cancel`,
          { method: "PUT" }
        );
        const j = (await cr.json()) as { error?: string };
        if (!cr.ok) {
          toast.error(j.error ?? "Không hủy được lộ trình");
          return;
        }
        toast.success("Đã hủy lộ trình cá nhân hóa.");
      }
      let ok = false;
      if (pathGate.kind === "reject") {
        ok = await runRejectRequest(
          pathGate.connectionId,
          pathGate.rejectNote ?? "",
          pathGate.fromAccepted ?? false
        );
      } else {
        ok = await runDeleteRequest(pathGate.connectionId);
      }
      if (ok) {
        setPathGate(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  function openEditLink(r: ConnectionRow) {
    setEditLinkId(r.id);
    setEditMeetCode(r.meeting_code?.trim() ?? "");
    setEditMeetLink(r.meeting_link?.trim() ?? "");
    setEditNote(r.teacher_response?.trim() ?? "");
  }

  function openReject(r: ConnectionRow, fromAccepted: boolean) {
    setRejectNote("");
    setRejectCtx({
      connectionId: r.id,
      student_id: r.student_id,
      studentLabel: r.student_name ?? r.student_id.slice(0, 8) + "…",
      fromAccepted,
    });
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
          {rows.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.24) }}
            >
            <Card className="h-full border-border/60 bg-card/80 shadow-sm transition hover:border-primary/25 hover:shadow-md">
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

                {r.status !== "pending" &&
                (r.meeting_code || r.meeting_link || r.teacher_response) ? (
                  <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
                    {r.meeting_code ? (
                      <p>
                        <span className="font-medium text-foreground">Mã lớp: </span>
                        <span className="font-mono text-foreground">{r.meeting_code}</span>
                      </p>
                    ) : null}
                    {r.meeting_link ? (
                      <p>
                        <span className="font-medium text-foreground">Phòng họp: </span>
                        <a
                          href={r.meeting_link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-primary underline"
                        >
                          {r.meeting_link.trim()}
                        </a>
                      </p>
                    ) : null}
                    {r.teacher_response ? (
                      <p>
                        <span className="font-medium text-foreground">Ghi chú: </span>
                        <span className="whitespace-pre-wrap text-foreground">
                          {r.teacher_response}
                        </span>
                      </p>
                    ) : null}
                  </div>
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
                        onClick={() => openReject(r, false)}
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
                        Sửa phòng họp
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openReject(r, true)}
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
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!respondId} onOpenChange={(o) => !o && setRespondId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chấp nhận kết nối</DialogTitle>
          </DialogHeader>
          {responding ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{responding.goal}</p>
              <div className="flex items-start gap-2 rounded-md border border-border p-3">
                <Checkbox
                  id="accept-auto"
                  checked={acceptUseAuto}
                  onCheckedChange={(v) => setAcceptUseAuto(v === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="accept-auto" className="cursor-pointer text-sm font-medium">
                    Tạo phòng Jitsi tự động (khuyến nghị)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Hệ thống sinh mã lớp và link tham gia; không cần dán link thủ công.
                  </p>
                </div>
              </div>
              {!acceptUseAuto ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    disabled={loading}
                    onClick={() => void prefetchJitsiForAccept()}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Sinh phòng Jitsi
                  </Button>
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-code">Mã lớp (tùy chọn)</Label>
                    <Input
                      id="acc-code"
                      value={acceptMeetCode}
                      onChange={(e) => setAcceptMeetCode(e.target.value)}
                      placeholder="VD: ABC123"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-link">Link phòng (tùy chọn)</Label>
                    <Input
                      id="acc-link"
                      value={acceptMeetLink}
                      onChange={(e) => setAcceptMeetLink(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="acc-note">Ghi chú thêm (tùy chọn)</Label>
                <Textarea
                  id="acc-note"
                  value={acceptNote}
                  onChange={(e) => setAcceptNote(e.target.value)}
                  placeholder="Lịch hẹn, kênh Zalo, …"
                  className="min-h-[72px]"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setRespondId(null)}>
                  Huỷ
                </Button>
                <Button type="button" disabled={loading} onClick={() => void submitAccept()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang gửi…
                    </>
                  ) : (
                    "Xác nhận chấp nhận"
                  )}
                </Button>
              </DialogFooter>
            </div>
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
        open={!!pathGate}
        onOpenChange={(o) => {
          if (!o) setPathGate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lộ trình đang hoạt động</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Học sinh <strong>{pathGate?.studentLabel}</strong> có lộ trình cá nhân
            hóa đang <strong>active</strong> hoặc <strong>paused</strong>. Bạn có
            muốn hủy lộ trình này không? (Khuyến nghị để ẩn lịch học và lộ trình
            khỏi phía học sinh.)
          </p>
          <div className="flex items-start gap-2 rounded-md border border-border p-3">
            <Checkbox
              id="cancel-path-gate"
              checked={cancelPathWithGate}
              onCheckedChange={(v) => setCancelPathWithGate(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="cancel-path-gate" className="cursor-pointer text-sm font-normal leading-snug">
              Hủy lộ trình cá nhân hóa (chuyển sang trạng thái cancelled)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {pathGate?.kind === "reject"
              ? "Sau đó hệ thống sẽ từ chối yêu cầu kết nối."
              : "Sau đó hệ thống sẽ xóa yêu cầu kết nối."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPathGate(null)} disabled={loading}>
              Huỷ
            </Button>
            <Button disabled={loading} onClick={() => void confirmPathGate()}>
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editLinkId}
        onOpenChange={(o) => {
          if (!o) {
            setEditLinkId(null);
            setEditMeetCode("");
            setEditMeetLink("");
            setEditNote("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cập nhật phòng họp</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={(e) => void submitEditMeeting(e)} className="space-y-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                disabled={loading}
                onClick={() => void prefetchJitsiForEdit()}
              >
                <Video className="h-3.5 w-3.5" />
                Tạo phòng Jitsi mới
              </Button>
              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Mã lớp</Label>
                <Input
                  id="edit-code"
                  value={editMeetCode}
                  onChange={(e) => setEditMeetCode(e.target.value)}
                  placeholder="Mã hiển thị cho HS"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-meet-link">Link phòng</Label>
                <Input
                  id="edit-meet-link"
                  value={editMeetLink}
                  onChange={(e) => setEditMeetLink(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-note">Ghi chú</Label>
                <Textarea
                  id="edit-note"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="min-h-[64px]"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditLinkId(null);
                    setEditMeetCode("");
                    setEditMeetLink("");
                    setEditNote("");
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
