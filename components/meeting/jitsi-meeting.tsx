"use client";

import { cn } from "@/lib/utils";

type Props = {
  /** Raw room id (UUID); iframe uses meet.jit.si/EduAI-{roomId} */
  roomId?: string;
  /** Full Jitsi URL (e.g. from API meeting_link) */
  meetingUrl?: string;
  className?: string;
  title?: string;
};

export function JitsiMeeting({
  roomId,
  meetingUrl,
  className,
  title = "Phòng họp",
}: Props) {
  const url =
    meetingUrl?.trim() ||
    (roomId?.trim()
      ? `https://meet.jit.si/${encodeURIComponent(`EduAI-${roomId.trim()}`)}`
      : "");
  if (!url) return null;
  return (
    <iframe
      title={title}
      src={url}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      className={cn("h-[min(70vh,560px)] w-full rounded-lg border border-border bg-black", className)}
    />
  );
}
