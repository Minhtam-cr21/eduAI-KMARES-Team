"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
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

const PATH_STATUS: Record<string, string> = {
  completed: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
};

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

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

  if (loading) return <DetailSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/teacher/students"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto px-0")}
        >
          ← Danh sách học sinh
        </Link>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{error ?? "Không có dữ liệu"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/students"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto px-0")}
      >
        ← Danh sách học sinh
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-lg font-bold text-white">
          {(data.student.full_name ?? "H")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {data.student.full_name ?? "Học sinh"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Mục tiêu: {data.student.goal ?? "—"} · Giờ/ngày:{" "}
            {data.student.hours_per_day ?? "—"}
          </p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tiến độ tổng thể</CardTitle>
          <CardDescription>
            {data.completedPaths} / {data.totalPaths} bài hoàn thành
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={data.progressPercent} className="h-3 flex-1" />
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {data.progressPercent}%
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" />
            Lộ trình học tập
          </CardTitle>
        </CardHeader>
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
                  <TableCell className="font-medium text-foreground">
                    {p.lesson?.title ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.lesson?.topic?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold capitalize",
                        PATH_STATUS[p.status] ?? ""
                      )}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.due_date ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/teacher/personalized-paths/${studentId}`}
          className={buttonVariants({ size: "default" })}
        >
          Tạo / sửa lộ trình cá nhân
        </Link>
      </div>
    </div>
  );
}
