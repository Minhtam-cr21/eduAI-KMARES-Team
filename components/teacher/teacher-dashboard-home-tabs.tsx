"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherDashboardStatsPremium } from "@/components/teacher/teacher-dashboard-stats-premium";
import type { TeacherDashboardStats } from "@/lib/teacher/dashboard-stats";
import type { CompletedAssessmentPendingStudent } from "@/lib/types/teacher";
import { cn } from "@/lib/utils";
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

export function TeacherDashboardHomeTabs({
  stats,
}: {
  stats: TeacherDashboardStats;
}) {
  const [pendingStudents, setPendingStudents] = useState<
    CompletedAssessmentPendingStudent[]
  >([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/teacher/students/completed-assessment");
      const data = (await res.json()) as {
        students?: CompletedAssessmentPendingStudent[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Không tải danh sách chờ lộ trình");
        setPendingStudents([]);
        return;
      }
      setPendingStudents(data.students ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      setPendingStudents([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
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
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
    void loadNotifications();
  }, [loadPending, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markNotificationRead(id: string) {
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
      await loadNotifications();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Bảng điều khiển
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          Tổng quan, học sinh chờ lộ trình cá nhân hóa, kết nối và thông báo.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="pending-path" className="gap-1.5">
            Học sinh chờ tạo lộ trình
            {pendingStudents.length > 0 ? (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                {pendingStudents.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="connections">Yêu cầu kết nối</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            Thông báo
            {unreadCount > 0 ? (
              <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                {unreadCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-8">
          <TeacherDashboardStatsPremium stats={stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Khóa học gần đây</CardTitle>
                <CardDescription>5 khóa mới nhất</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.recent_courses.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Chưa có khóa học.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent_courses.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {c.status} · {c.lesson_count} bài
                          </p>
                        </div>
                        <Link
                          href={`/teacher/courses/${c.id}/curriculum`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "shrink-0"
                          )}
                        >
                          Bài học
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/teacher/courses"
                  className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
                >
                  Tất cả khóa học
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Yêu cầu kết nối (chờ)
                </CardTitle>
                <CardDescription>
                  Tối đa 5 yêu cầu pending gần nhất
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.recent_pending_requests.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Không có yêu cầu chờ.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent_pending_requests.map((r) => (
                      <li
                        key={r.id}
                        className="border-b border-border pb-2 last:border-0"
                      >
                        <p className="text-sm font-medium">
                          {r.student?.full_name ?? r.student_id}
                        </p>
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {r.goal}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/teacher/connections"
                  className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
                >
                  Quản lý kết nối
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending-path" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Học sinh chờ tạo lộ trình</CardTitle>
                <CardDescription>
                  Đã hoàn thành trắc nghiệm, chưa có lộ trình cá nhân hóa đang
                  hoạt động hoặc chờ học sinh duyệt.
                </CardDescription>
              </div>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => void loadPending()}
              >
                Làm mới
              </button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {pendingLoading ? (
                <p className="text-muted-foreground text-sm">Đang tải…</p>
              ) : pendingStudents.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Không có học sinh nào trong danh sách.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>MBTI</TableHead>
                      <TableHead>Hoàn thành test</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {s.email ?? "—"}
                        </TableCell>
                        <TableCell>{s.mbti_type ?? "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {s.assessment_completed_at
                            ? new Date(
                                s.assessment_completed_at
                              ).toLocaleString("vi-VN")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/teacher/personalized-paths/${s.id}`}
                            className={cn(
                              buttonVariants({ size: "sm" }),
                              "inline-flex"
                            )}
                          >
                            Tạo lộ trình
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Yêu cầu kết nối</CardTitle>
              <CardDescription>
                Các yêu cầu đang chờ bạn xử lý (xem đầy đủ trên trang Kết nối).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.recent_pending_requests.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Không có yêu cầu chờ.
                </p>
              ) : (
                <ul className="space-y-3">
                  {stats.recent_pending_requests.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-md border border-border p-3 text-sm"
                    >
                      <p className="font-medium">
                        {r.student?.full_name ?? r.student_id}
                      </p>
                      <p className="text-muted-foreground mt-1">{r.goal}</p>
                      {r.available_time ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Thời gian: {r.available_time}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/teacher/connections"
                className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
              >
                Mở trang kết nối
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Thông báo</CardTitle>
                <CardDescription>
                  Học sinh hoàn thành trắc nghiệm và các sự kiện liên quan.
                </CardDescription>
              </div>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => void loadNotifications()}
              >
                Làm mới
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifLoading ? (
                <p className="text-muted-foreground text-sm">Đang tải…</p>
              ) : notifications.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Chưa có thông báo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "rounded-lg border p-3 text-sm",
                        !n.is_read && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{n.title ?? n.type}</p>
                          {n.content ? (
                            <p className="text-muted-foreground mt-1">
                              {n.content}
                            </p>
                          ) : null}
                          <p className="text-muted-foreground mt-1 text-xs">
                            {new Date(n.created_at).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {n.link ? (
                            <Link
                              href={n.link}
                              className={cn(
                                buttonVariants({ size: "sm", variant: "secondary" })
                              )}
                            >
                              Mở
                            </Link>
                          ) : null}
                          {!n.is_read ? (
                            <button
                              type="button"
                              className={cn(
                                buttonVariants({ size: "sm", variant: "ghost" })
                              )}
                              onClick={() => void markNotificationRead(n.id)}
                            >
                              Đánh dấu đã đọc
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
