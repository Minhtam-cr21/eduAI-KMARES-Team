"use client";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type NotificationRow = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function TeacherNotificationsPageClient() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/teacher");
      const data = (await res.json()) as {
        notifications?: NotificationRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Không tải thông báo");
        setNotifications([]);
        return;
      }
      setNotifications(data.notifications ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    try {
      const res = await fetch("/api/notifications/teacher", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_read: true }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    }
  }

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">Danh sách</CardTitle>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() => void load()}
        >
          Làm mới
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">Đang tải…</p>
        ) : notifications.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có thông báo.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={cn(
                  "rounded-xl border p-4 text-sm transition-colors",
                  !n.is_read
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/60 bg-background/50"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{n.title ?? n.type}</p>
                    {n.content ? (
                      <p className="text-muted-foreground mt-1">{n.content}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-2 text-xs tabular-nums">
                      {new Date(n.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {n.link ? (
                      <Link
                        href={n.link}
                        className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                      >
                        Mở
                      </Link>
                    ) : null}
                    {!n.is_read ? (
                      <button
                        type="button"
                        className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                        onClick={() => void markRead(n.id)}
                      >
                        Đánh dấu đã đọc
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
