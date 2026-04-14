"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** Gọi một lần khi vào trang học — cập nhật profiles.last_activity_at. */
export function LessonActivityPing() {
  useEffect(() => {
    void fetch("/api/user/activity", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}

type Props = {
  lessonId: string;
};

/**
 * Lấy schedule qua GET /api/study-schedule/by-lesson, hoàn thành qua POST /api/study-schedule/complete.
 */
export function LessonScheduleCompleteSection({ lessonId }: Props) {
  const router = useRouter();
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const res = await fetch(
          `/api/study-schedule/by-lesson?lessonId=${encodeURIComponent(lessonId)}`
        );
        const j = (await res.json()) as {
          schedule_id?: string | null;
          status?: string | null;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setScheduleId(null);
            setStatus(null);
          }
          return;
        }
        if (cancelled) return;
        setScheduleId(j.schedule_id ?? null);
        setStatus(j.status ?? null);
      } catch {
        if (!cancelled) {
          setScheduleId(null);
          setStatus(null);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const handleComplete = useCallback(async () => {
    if (!scheduleId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/study-schedule/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      setStatus("completed");
      toast.success("Đã đánh dấu hoàn thành.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setSubmitting(false);
    }
  }, [router, scheduleId]);

  if (fetching) {
    return (
      <div
        className="h-9 w-[160px] animate-pulse rounded-md bg-muted"
        aria-hidden
      />
    );
  }

  if (status === "completed") {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
        Đã hoàn thành
      </Badge>
    );
  }

  if (status === "pending" && scheduleId) {
    return (
      <Button
        type="button"
        disabled={submitting}
        onClick={() => void handleComplete()}
      >
        {submitting ? "Đang xử lý…" : "Đánh dấu hoàn thành"}
      </Button>
    );
  }

  return null;
}
