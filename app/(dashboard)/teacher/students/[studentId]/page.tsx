"use client";

import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ProgressPayload = {
  student: {
    id: string;
    role?: string;
    full_name: string | null;
    goal: string | null;
    hours_per_day: number | null;
  };
  progressPercent: number;
  totalPaths: number;
  completedPaths: number;
  learningPaths: Array<{
    id: string;
    status: string;
    due_date: string | null;
    completed_at?: string | null;
    lesson: { id: string; title: string; topic: { name: string } | null } | null;
  }>;
};

export default function TeacherStudentDetailPage() {
  const params = useParams();
  const studentId =
    typeof params.studentId === "string" ? params.studentId : "";
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/teacher/students/${studentId}/progress`);
        const j = (await res.json()) as ProgressPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(j.error ?? "Không tải được");
          return;
        }
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Lỗi mạng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-destructive text-sm">{error ?? "Không có dữ liệu"}</p>
        <Link
          href="/teacher/students"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}
        >
          ← Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <BackButton fallbackHref="/teacher/students" className="mb-2" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {data.student.full_name ?? "Học sinh"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Mục tiêu: {data.student.goal ?? "—"} · Giờ/ngày:{" "}
            {data.student.hours_per_day ?? "—"}
          </p>
        </div>
        <Link
          href="/teacher/students"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Danh sách
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tiến độ</CardTitle>
          <CardDescription>
            {data.completedPaths} / {data.totalPaths} bài hoàn thành (
            {data.progressPercent}%)
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lộ trình học tập</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bài học</TableHead>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.learningPaths.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Chưa có bài trong lộ trình.
                  </TableCell>
                </TableRow>
              ) : (
                data.learningPaths.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.lesson?.title ?? "—"}</TableCell>
                    <TableCell>{p.lesson?.topic?.name ?? "—"}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>{p.due_date ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
