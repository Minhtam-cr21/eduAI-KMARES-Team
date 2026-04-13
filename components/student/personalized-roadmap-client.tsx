"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type PathRow = {
  id: string;
  status: string;
  course_sequence: unknown;
  student_feedback: string | null;
  teacher_feedback: string | null;
  updated_at: string | null;
};

type CourseMeta = { id: string; title: string; category: string };

function sequenceSummary(
  raw: unknown,
  courses: Map<string, CourseMeta>
): string[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw as { course_id?: string; order_index?: number }[];
  const sorted = [...rows].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  return sorted.map((r, i) => {
    const meta = r.course_id ? courses.get(r.course_id) : undefined;
    return `${i + 1}. ${meta?.title ?? r.course_id ?? "?"}`;
  });
}

export function PersonalizedRoadmapClient({
  paths,
  courseList,
}: {
  paths: PathRow[];
  courseList: CourseMeta[];
}) {
  const router = useRouter();
  const courseMap = new Map(courseList.map((c) => [c.id, c]));

  const latest = paths[0] ?? null;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestExtra, setSuggestExtra] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function approve() {
    if (!latest) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/personalized-path/student/${latest.id}/approve`,
        { method: "POST" }
      );
      const j = (await res.json()) as { error?: string; scheduleItems?: number };
      if (!res.ok) {
        toast.error(j.error ?? "Không duyệt được");
        return;
      }
      toast.success(
        `Đã kích hoạt lộ trình. Đã tạo ${j.scheduleItems ?? 0} mục lịch học.`
      );
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback() {
    if (!latest || !feedbackText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/personalized-path/student/${latest.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedbackText: feedbackText.trim(),
            suggestedChanges: suggestExtra.trim() || undefined,
          }),
        }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Gửi góp ý thất bại");
        return;
      }
      toast.success("Đã gửi góp ý cho giáo viên.");
      setFeedbackOpen(false);
      setFeedbackText("");
      setSuggestExtra("");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const lines = latest
    ? sequenceSummary(latest.course_sequence, courseMap)
    : [];

  const status = latest?.status;

  return (
    <div className="space-y-6">
      {!latest ? (
        <p className="text-sm text-muted-foreground">
          Giáo viên chưa tạo lộ trình cho bạn. Khi có đề xuất, trạng thái sẽ
          hiển thị tại đây.
        </p>
      ) : status === "pending_student_approval" ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">
            Giáo viên đã gửi lộ trình — vui lòng xem và xác nhận.
          </p>
          <ul className="list-inside list-decimal text-sm text-muted-foreground">
            {lines.length ? (
              lines.map((l) => <li key={l}>{l}</li>)
            ) : (
              <li>Chưa có danh sách khóa (course_sequence).</li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={cn(buttonVariants())}
              onClick={() => void approve()}
            >
              Đồng ý
            </button>
            <button
              type="button"
              disabled={busy}
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => setFeedbackOpen(true)}
            >
              Góp ý
            </button>
          </div>
        </div>
      ) : status === "revision_requested" ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Bạn đã góp ý. Giáo viên đang chỉnh sửa lộ trình.
        </p>
      ) : status === "active" ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Lộ trình đang áp dụng. Xem lịch học theo ngày và đánh dấu hoàn
            thành từng bài.
          </p>
          <Link
            href="/study-schedule"
            className={cn(buttonVariants(), "inline-flex")}
          >
            Mở lịch học
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Trạng thái lộ trình: <strong>{status}</strong>
        </p>
      )}

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Góp ý lộ trình</DialogTitle>
          </DialogHeader>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Ý kiến của bạn..."
            rows={4}
          />
          <Textarea
            value={suggestExtra}
            onChange={(e) => setSuggestExtra(e.target.value)}
            placeholder="Đề xuất chỉnh sửa (tuỳ chọn)"
            rows={3}
            className="mt-2"
          />
          <DialogFooter>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => setFeedbackOpen(false)}
            >
              Huỷ
            </button>
            <button
              type="button"
              className={cn(buttonVariants())}
              disabled={busy || !feedbackText.trim()}
              onClick={() => void sendFeedback()}
            >
              Gửi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
