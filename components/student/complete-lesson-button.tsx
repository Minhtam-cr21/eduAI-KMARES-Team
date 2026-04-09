"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  lessonId: string;
  initialCompleted: boolean;
};

export function CompleteLessonButton({ lessonId, initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/complete-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        alreadyCompleted?: boolean;
        error?: string;
      };

      if (!res.ok) {
        toast.error("Không lưu được tiến độ", {
          description: data.error ?? res.statusText,
        });
        return;
      }

      setCompleted(true);

      if (data.alreadyCompleted) {
        toast.info("Bài học đã được đánh dấu hoàn thành trước đó.");
      } else {
        toast.success("Đã lưu tiến độ!");
      }
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : "Unknown",
      });
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white opacity-80"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Đã hoàn thành
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleComplete}
      disabled={loading}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
    >
      {loading ? "Đang lưu…" : "Hoàn thành bài học"}
    </button>
  );
}
