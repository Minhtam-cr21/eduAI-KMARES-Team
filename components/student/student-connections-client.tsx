"use client";

import { JitsiMeeting } from "@/components/meeting/jitsi-meeting";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ConnectionRequest } from "@/types/database";
import { ExternalLink, Link2, Video, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  accepted:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
};

function isJitsiRoomIdStored(s: string | null | undefined): boolean {
  const t = s?.trim() ?? "";
  if (!t) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    t
  );
}

type MeetOpen = { meetingUrl: string; roomId?: string } | null;

export function StudentConnectionsClient() {
  const [rows, setRows] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetOpen, setMeetOpen] = useState<MeetOpen>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connection-requests/student");
      const data = (await res.json()) as ConnectionRequest[] | { error?: string };
      if (!res.ok) {
        toast.error(
          typeof data === "object" && data && "error" in data
            ? String(data.error)
            : "Không tải yêu cầu"
        );
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function joinMeeting(r: ConnectionRequest) {
    const url = r.meeting_link?.trim();
    const room = r.teacher_response?.trim();
    if (url) {
      setMeetOpen({ meetingUrl: url, roomId: isJitsiRoomIdStored(room) ? room : undefined });
      return;
    }
    if (isJitsiRoomIdStored(room)) {
      setMeetOpen({ meetingUrl: "", roomId: room! });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Yêu cầu kết nối
            </h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi trạng thái và phòng họp Jitsi từ giáo viên.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void load()}
          >
            Làm mới
          </Button>
          <Link
            href="/student/teachers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Khám phá giáo viên
          </Link>
        </div>
      </div>

      <Dialog open={!!meetOpen} onOpenChange={(o) => !o && setMeetOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Phòng họp</DialogTitle>
          </DialogHeader>
          {meetOpen ? (
            <JitsiMeeting
              meetingUrl={meetOpen.meetingUrl || undefined}
              roomId={meetOpen.roomId}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Chưa có yêu cầu nào.
            </p>
            <Link
              href="/student/teachers"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-4"
              )}
            >
              Gửi yêu cầu kết nối
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const canJoin =
              r.status === "accepted" &&
              !!(r.meeting_link?.trim() || isJitsiRoomIdStored(r.teacher_response));
            return (
              <Card key={r.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold capitalize",
                        STATUS_STYLE[r.status] ?? ""
                      )}
                    >
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString("vi-VN")
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{r.goal}</p>
                  {r.reason ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Lý do: </span>
                      {r.reason}
                    </p>
                  ) : null}
                  {r.desired_roadmap ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Lộ trình mong muốn:{" "}
                      </span>
                      {r.desired_roadmap}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    GV:{" "}
                    <Link
                      href={`/student/teachers/${r.teacher_id}`}
                      className="text-primary underline"
                    >
                      Xem profile
                    </Link>
                  </p>
                  {r.status === "accepted" &&
                  (r.meeting_code || r.meeting_link || r.teacher_response) ? (
                    <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
                      {r.meeting_code ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Mã lớp:{" "}
                          </span>
                          <span className="font-mono text-foreground">
                            {r.meeting_code}
                          </span>
                        </p>
                      ) : null}
                      {r.meeting_link ? (
                        <p className="break-all text-primary underline">
                          <a
                            href={r.meeting_link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {r.meeting_link.trim()}
                          </a>
                        </p>
                      ) : null}
                      {r.teacher_response && !isJitsiRoomIdStored(r.teacher_response) ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Ghi chú GV:{" "}
                          </span>
                          <span className="whitespace-pre-wrap text-foreground">
                            {r.teacher_response}
                          </span>
                        </p>
                      ) : null}
                      {canJoin ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1"
                            onClick={() => joinMeeting(r)}
                          >
                            <Video className="h-3.5 w-3.5" />
                            Tham gia phòng họp
                          </Button>
                          {(r.meeting_link?.trim() ?? "") ? (
                            <a
                              href={r.meeting_link!.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "gap-1 no-underline"
                              )}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Tab mới
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
