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
  scheduleId: string | null;
  initialStatus: string | null;
};

export function LessonScheduleCompleteSection({
  scheduleId,
  initialStatus,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleComplete = useCallback(async () => {
    if (!scheduleId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/study-schedule/${scheduleId}/complete`, {
        method: "POST",
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
      setLoading(false);
    }
  }, [router, scheduleId]);

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
        disabled={loading}
        onClick={() => void handleComplete()}
      >
        {loading ? "Đang xử lý…" : "Đánh dấu hoàn thành"}
      </Button>
    );
  }

  return null;
}
