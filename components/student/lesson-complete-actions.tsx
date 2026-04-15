"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  courseId: string;
  lessonId: string;
  lessonType: string | null;
  hasVideo: boolean;
  initialCompleted: boolean;
};

/** POST /api/user/courses/[courseId]/lessons/[lessonId]/complete — video bài cần tick xác nhận đã xem. */
export function LessonCompleteActions({
  courseId,
  lessonId,
  lessonType,
  hasVideo,
  initialCompleted,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [videoAttested, setVideoAttested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const needVideoAttest = lessonType === "video" && hasVideo;
  const canSubmit = !needVideoAttest || videoAttested;
  const videoHint =
    "T\u00F4i \u0111\u00E3 xem h\u1EBFt video. Ch\u1EC9 m\u1EDF n\u00FAt ho\u00E0n th\u00E0nh sau khi b\u1EA1n x\u00E1c nh\u1EADn.";

  async function markComplete() {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/user/courses/${courseId}/lessons/${lessonId}/complete`,
        { method: "POST" }
      );
      const j = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được tiến độ");
        return;
      }
      setCompleted(true);
      toast.success("Đã đánh dấu hoàn thành bài học");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
        Bài học đã hoàn thành
      </Badge>
    );
  }

  return (
    <div className="flex min-w-[200px] flex-col gap-3">
      {needVideoAttest ? (
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={videoAttested}
            onChange={(e) => setVideoAttested(e.target.checked)}
          />
          <span>{videoHint}</span>
        </label>
      ) : null}
      <Button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={() => void markComplete()}
      >
        {submitting ? "Đang lưu…" : "Đánh dấu hoàn thành bài học"}
      </Button>
    </div>
  );
}
