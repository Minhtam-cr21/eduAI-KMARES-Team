"use client";

import {
  StudyCalendar,
  type StudyCalendarItem,
} from "@/components/calendar/study-calendar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function StudySchedulePage() {
  const [items, setItems] = useState<StudyCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/study-schedule");
      const j = (await res.json()) as {
        items?: StudyCalendarItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải lịch");
        return;
      }
      setItems(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/user/activity", { method: "POST" }).catch(() => {});
  }, [load]);

  async function markDone(id: string) {
    const res = await fetch(`/api/study-schedule/${id}/complete`, {
      method: "POST",
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error ?? "Không cập nhật được");
      return;
    }
    toast.success("Đã đánh dấu hoàn thành.");
    void load();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Lịch học</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/personalized-roadmap"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            Lộ trình
          </Link>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }))}>
            Dashboard
          </Link>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Danh sách theo hạn</CardTitle>
          <CardDescription>
            Hoàn thành từng bài; deadline trượt sẽ được hệ thống xử lý hằng
            ngày.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có mục lịch. Khi bạn đồng ý lộ trình cá nhân hóa, lịch sẽ xuất
              hiện tại đây.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => {
                const href =
                  it.lesson?.course_id && it.lesson?.id
                    ? `/student/courses/${it.lesson.course_id}/lessons/${it.lesson.id}`
                    : null;
                return (
                  <li
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {it.lesson?.title ?? "Bài học"}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {it.due_date} · {it.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {href ? (
                        <Link
                          href={href}
                          className={cn(
                            buttonVariants({ variant: "secondary", size: "sm" }),
                            "inline-flex"
                          )}
                        >
                          Học
                        </Link>
                      ) : null}
                      {it.status === "pending" ? (
                        <button
                          type="button"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                          onClick={() => void markDone(it.id)}
                        >
                          Xong
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch tháng</CardTitle>
          <CardDescription>
            Màu theo trạng thái: chờ, hoàn thành, trượt, đóng băng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudyCalendar items={items} />
        </CardContent>
      </Card>
    </main>
  );
}
