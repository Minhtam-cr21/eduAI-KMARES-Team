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
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type RoadmapModule = {
  name: string;
  lessons: string[];
  duration_days: number;
};

type RoadmapPayload = {
  title: string;
  modules: RoadmapModule[];
  total_duration_days: number;
  reasoning: string;
};

export function AiRoadmapRequestDialog({
  renderTrigger,
}: {
  renderTrigger?: (a: { open: () => void }) => ReactNode;
} = {}) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  const [result, setResult] = useState<RoadmapPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setGoal("");
    setTimeframe("");
    setNotes("");
    setRoadmapId(null);
    setResult(null);
  }

  async function onGenerate() {
    if (!goal.trim() || !timeframe.trim()) {
      toast.error("Nhập mục tiêu và khung thời gian.");
      return;
    }
    setLoading(true);
    setResult(null);
    setRoadmapId(null);
    try {
      const res = await fetch("/api/ai/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim(),
          timeframe: timeframe.trim(),
          additionalNotes: notes.trim() || null,
        }),
      });
      const j = (await res.json()) as {
        id?: string;
        roadmap?: RoadmapPayload;
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được lộ trình");
        return;
      }
      if (j.roadmap && j.id) {
        setResult(j.roadmap);
        setRoadmapId(j.id);
        toast.success("Đã tạo lộ trình (bản nháp).");
      }
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitForReview() {
    if (!roadmapId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ai/custom-roadmap/${roadmapId}/submit`, {
        method: "POST",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không gửi được");
        return;
      }
      toast.success("Đã gửi trạng thái chờ giáo viên duyệt.");
      setOpen(false);
      reset();
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: () => setOpen(true) })
      ) : (
        <button
          type="button"
          className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:shadow-md"
          onClick={() => setOpen(true)}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Yêu cầu AI tạo lộ trình</p>
            <p className="mt-1 text-sm text-muted-foreground">
              RAG từ tài liệu roadmap Python; lưu bản nháp, có thể gửi giáo viên duyệt.
            </p>
          </div>
        </button>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI tạo lộ trình cá nhân</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-goal">Mục tiêu học tập</Label>
              <Textarea
                id="ai-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ví dụ: Học Python để làm automation và API backend…"
                className="min-h-[72px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-time">Khung thời gian</Label>
              <Input
                id="ai-time"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="Ví dụ: 8 tuần, 1–2 giờ/ngày"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-notes">Ghi chú thêm (tuỳ chọn)</Label>
              <Textarea
                id="ai-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trình độ hiện tại, hạn chế thời gian…"
                className="min-h-[56px]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-foreground">{result.title}</p>
            <p className="text-muted-foreground">
              Tổng thời gian ước tính:{" "}
              <span className="font-medium text-foreground">
                {result.total_duration_days} ngày
              </span>
            </p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              {result.modules.map((m) => (
                <li key={m.name}>
                  <span className="font-medium text-foreground">{m.name}</span> (
                  {m.duration_days} ngày)
                  <ul className="ml-4 mt-1 list-inside list-[circle]">
                    {m.lessons.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Lý do gợi ý</p>
              <p className="mt-1 text-xs text-muted-foreground">{result.reasoning}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!result ? (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Đóng
              </Button>
              <Button type="button" disabled={loading} onClick={() => void onGenerate()}>
                {loading ? "Đang tạo…" : "Tạo lộ trình"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setRoadmapId(null);
                }}
              >
                Tạo lại
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void onSubmitForReview()}
              >
                {submitting ? "Đang gửi…" : "Gửi giáo viên duyệt"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
