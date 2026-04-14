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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ModuleItem = { name: string; lessons: string[]; duration_days: number };

type RoadmapRow = {
  id: string;
  user_id: string;
  title: string | null;
  modules: ModuleItem[] | null;
  total_duration_days: number | null;
  reasoning: string | null;
  status: string;
  teacher_feedback: string | null;
  created_at: string;
  student_name: string | null;
};

export function TeacherAiRoadmapsClient() {
  const [rows, setRows] = useState<RoadmapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RoadmapRow | null>(null);
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/custom-roadmaps?status=pending");
      const j = (await res.json()) as { roadmaps?: RoadmapRow[]; error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải được");
        setRows([]);
        return;
      }
      setRows(j.roadmaps ?? []);
    } catch {
      toast.error("Lỗi mạng");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(status: "approved" | "rejected") {
    if (!detail) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/teacher/custom-roadmaps/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          teacher_feedback: feedback.trim() || null,
          autoPersonalizedPath: false,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      if (status === "approved") {
        toast.success(
          "Đã duyệt lộ trình AI. Bạn có thể tạo lộ trình cá nhân hóa thủ công cho học sinh khi cần."
        );
      } else {
        toast.success("Đã từ chối");
      }
      setDetail(null);
      setFeedback("");
      await load();
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">Đang tải danh sách…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center"
      >
        <p className="text-muted-foreground text-sm">
          Không có lộ trình AI nào đang chờ duyệt.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-sm"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Học sinh</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead className="text-right">Ngày gửi</TableHead>
              <TableHead className="text-right">Thời gian (ngày)</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.student_name ?? r.user_id.slice(0, 8) + "…"}
                </TableCell>
                <TableCell className="max-w-[240px] truncate">
                  {r.title ?? "—"}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.total_duration_days ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setDetail(r)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Chi tiết
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title ?? "Lộ trình AI"}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Học sinh:{" "}
                <span className="font-medium text-foreground">
                  {detail.student_name ?? detail.user_id}
                </span>
              </p>
              <Badge variant="outline" className="capitalize">
                {detail.status}
              </Badge>
              <div>
                <p className="mb-2 font-medium text-foreground">Modules</p>
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/60 p-3 text-muted-foreground">
                  {(detail.modules ?? []).map((m) => (
                    <li key={m.name}>
                      <span className="font-medium text-foreground">{m.name}</span>{" "}
                      ({m.duration_days} ngày)
                      <ul className="ml-3 mt-1 list-inside list-disc text-xs">
                        {m.lessons.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
              {detail.reasoning ? (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-medium text-foreground">Lý do gợi ý</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail.reasoning}</p>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="ai-fb">Phản hồi cho học sinh (tuỳ chọn)</Label>
                <Textarea
                  id="ai-fb"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Ghi chú khi duyệt / lý do từ chối…"
                  rows={3}
                />
              </div>
              <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
                <Checkbox
                  id="auto-path"
                  checked={false}
                  disabled
                  aria-describedby="auto-path-hint"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="auto-path"
                    className="cursor-not-allowed font-medium leading-snug text-muted-foreground"
                  >
                    Tự động tạo lộ trình cá nhân hóa từ gợi ý này
                  </Label>
                  <p id="auto-path-hint" className="text-xs text-muted-foreground">
                    Tính năng sẽ bổ sung sau khi gắn module AI với khóa học trong hệ thống.
                    Hiện tại chỉ cập nhật trạng thái duyệt.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={actionLoading}
              onClick={() => void patchStatus("rejected")}
            >
              Từ chối
            </Button>
            <Button
              type="button"
              disabled={actionLoading}
              onClick={() => void patchStatus("approved")}
            >
              {actionLoading ? "Đang xử lý…" : "Duyệt"}
            </Button>
          </DialogFooter>
          <p className="text-muted-foreground text-xs">
            Duyệt chỉ lưu trạng thái và phản hồi trên bản ghi lộ trình AI. Tạo lộ trình cá nhân
            hóa (<code className="rounded bg-muted px-1">personalized_paths</code>) thực hiện
            thủ công từ trang quản lý học sinh khi bạn sẵn sàng gắn khóa học cụ thể.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
