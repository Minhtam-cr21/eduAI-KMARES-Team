"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string | null;
  onSent?: () => void;
};

export function ConnectTeacherDialog({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  onSent,
}: Props) {
  const [goal, setGoal] = useState("");
  const [reason, setReason] = useState("");
  const [desiredRoadmap, setDesiredRoadmap] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [sending, setSending] = useState(false);

  function reset() {
    setGoal("");
    setReason("");
    setDesiredRoadmap("");
    setAvailableTime("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const g = goal.trim();
    const r = reason.trim();
    if (!g) {
      toast.error("Nhập mục tiêu.");
      return;
    }
    if (!r) {
      toast.error("Nhập lý do kết nối.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/connection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId,
          goal: g,
          reason: r,
          desired_roadmap: desiredRoadmap.trim() || null,
          available_time: availableTime.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Không gửi được", { description: data.error });
        return;
      }
      toast.success("Đã gửi yêu cầu kết nối.");
      reset();
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      toast.error("Lỗi mạng", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kết nối giáo viên</DialogTitle>
          <DialogDescription>
            Gửi yêu cầu tới{" "}
            <span className="font-medium text-foreground">
              {teacherName?.trim() || "giáo viên"}
            </span>
            . Giáo viên sẽ xem mục tiêu và lý do của bạn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ct-goal">Mục tiêu học tập *</Label>
            <Textarea
              id="ct-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ví dụ: Học lập trình web full-stack trong 6 tháng…"
              className="min-h-[72px]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-reason">Lý do muốn kết nối *</Label>
            <Textarea
              id="ct-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Cần mentor chỉnh bài và định hướng dự án…"
              className="min-h-[72px]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-roadmap">Lộ trình mong muốn (tuỳ chọn)</Label>
            <Textarea
              id="ct-roadmap"
              value={desiredRoadmap}
              onChange={(e) => setDesiredRoadmap(e.target.value)}
              placeholder="Ví dụ: HTML/CSS → JavaScript → React → Node…"
              className="min-h-[64px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-time">Thời gian rảnh (tuỳ chọn)</Label>
            <Input
              id="ct-time"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              placeholder="Ví dụ: Tối T2–T6, 19h–21h"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? "Đang gửi…" : "Gửi yêu cầu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
