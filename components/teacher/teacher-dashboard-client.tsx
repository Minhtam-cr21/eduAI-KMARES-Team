"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProgressResponse = {
  student: {
    id: string;
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
    completed_at: string | null;
    lesson: {
      id: string;
      title: string;
      topic: { name: string } | null;
    } | null;
  }>;
  recentSubmissions: Array<{
    id: string;
    language: string;
    output: string | null;
    error: string | null;
    created_at: string;
  }>;
};

function pct(total: number, done: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export function TeacherDashboardClient() {
  const [students, setStudents] = useState<TeacherStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalFilter, setGoalFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProgressResponse | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/students");
      const data = (await res.json()) as {
        students?: TeacherStudentRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error("Không tải danh sách", {
          description: data.error ?? res.statusText,
        });
        setStudents([]);
        return;
      }
      setStudents(data.students ?? []);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const goalOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const g = s.goal?.trim();
      if (g) set.add(g);
    });
    return ["all", ...Array.from(set).sort()];
  }, [students]);

  const filteredRows = useMemo(() => {
    let rows = students;
    if (goalFilter !== "all") {
      rows = rows.filter(
        (s) =>
          (s.goal ?? "").trim().toLowerCase() === goalFilter.toLowerCase()
      );
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const name = (s.full_name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const goal = (s.goal ?? "").toLowerCase();
      return (
        name.includes(q) || email.includes(q) || goal.includes(q)
      );
    });
  }, [students, search, goalFilter]);

  async function openDetail(studentId: string) {
    setSelectedId(studentId);
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/teacher/students/${studentId}/progress`);
      const data = (await res.json()) as ProgressResponse & { error?: string };
      if (!res.ok) {
        toast.error("Không tải chi tiết", { description: data.error });
        setDetail(null);
        return;
      }
      setDetail(data);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setDetailLoading(false);
    }
  }

  const completedList =
    detail?.learningPaths.filter((p) => p.status === "completed") ?? [];
  const pendingList =
    detail?.learningPaths.filter((p) => p.status !== "completed") ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Theo dõi tiến độ học sinh
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Danh sách học sinh, tiến độ lộ trình và lịch sử nộp code gần đây.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bộ lọc</CardTitle>
          <CardDescription>
            Lọc theo mục tiêu (goal) và tìm theo tên hoặc email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="goal-filter">Mục tiêu</Label>
            <select
              id="goal-filter"
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
              className="border-input bg-background h-9 w-full min-w-[180px] rounded-md border px-2 text-sm sm:w-auto"
            >
              {goalOptions.map((g) => (
                <option key={g} value={g}>
                  {g === "all" ? "Tất cả" : g}
                </option>
              ))}
            </select>
          </div>
          <div className="max-w-md flex-1 space-y-2">
            <Label htmlFor="search-student">Tìm kiếm</Label>
            <Input
              id="search-student"
              placeholder="Tên, email, goal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadStudents()}
          >
            Làm mới
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Học sinh</CardTitle>
          <CardDescription>
            Nhấn một dòng để xem chi tiết tiến độ và lịch sử code.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-muted-foreground text-sm">Đang tải…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mục tiêu</TableHead>
                  <TableHead className="text-right">Giờ/ngày</TableHead>
                  <TableHead className="text-right">Đã học / Tổng</TableHead>
                  <TableHead className="text-right">Hoàn thành</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground text-center"
                    >
                      Không có học sinh nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((s) => {
                    const total = Number(s.learning_paths_total) || 0;
                    const done = Number(s.learning_paths_completed) || 0;
                    const p = pct(total, done);
                    return (
                      <TableRow
                        key={s.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => void openDetail(s.id)}
                      >
                        <TableCell className="font-medium">
                          {s.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {s.email ?? "—"}
                        </TableCell>
                        <TableCell>{s.goal ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.hours_per_day ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {done} / {total}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums font-medium">{p}%</span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết học sinh</DialogTitle>
            <DialogDescription>
              Tiến độ lộ trình và hoạt động code gần đây.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-muted-foreground text-sm">Đang tải…</p>
          ) : detail ? (
            <div className="space-y-4">
              <div>
                <p className="font-medium">
                  {detail.student.full_name ?? "—"}
                </p>
                <p className="text-muted-foreground text-sm">
                  Mục tiêu: {detail.student.goal ?? "—"} ·{" "}
                  {detail.student.hours_per_day != null
                    ? `${detail.student.hours_per_day} giờ/ngày`
                    : "—"}
                </p>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Tiến độ lộ trình</span>
                  <span className="font-medium tabular-nums">
                    {detail.progressPercent}% ({detail.completedPaths}/
                    {detail.totalPaths})
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${detail.progressPercent}%` }}
                  />
                </div>
              </div>

              <Tabs defaultValue="lessons" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lessons">Bài học</TabsTrigger>
                  <TabsTrigger value="code">Code gần đây</TabsTrigger>
                </TabsList>
                <TabsContent value="lessons" className="space-y-3">
                  <div>
                    <p className="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Đã hoàn thành ({completedList.length})
                    </p>
                    <ul className="text-muted-foreground max-h-36 space-y-1 overflow-auto text-sm">
                      {completedList.length === 0 ? (
                        <li>Chưa có.</li>
                      ) : (
                        completedList.map((p) => (
                          <li key={p.id}>
                            {p.lesson?.topic?.name ?? "—"} —{" "}
                            {p.lesson?.title ?? "—"}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-amber-800 dark:text-amber-200">
                      Chưa hoàn thành ({pendingList.length})
                    </p>
                    <ul className="text-muted-foreground max-h-36 space-y-1 overflow-auto text-sm">
                      {pendingList.length === 0 ? (
                        <li>Không còn bài nào.</li>
                      ) : (
                        pendingList.map((p) => (
                          <li key={p.id}>
                            {p.lesson?.topic?.name ?? "—"} —{" "}
                            {p.lesson?.title ?? "—"}{" "}
                            <span className="text-xs">({p.status})</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </TabsContent>
                <TabsContent value="code">
                  {detail.recentSubmissions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Chưa có bản nộp code nào.
                    </p>
                  ) : (
                    <ul className="max-h-64 space-y-3 overflow-auto text-sm">
                      {detail.recentSubmissions.map((sub) => (
                        <li
                          key={sub.id}
                          className="border-border rounded-md border p-2"
                        >
                          <div className="text-muted-foreground flex justify-between text-xs">
                            <span>{sub.language}</span>
                            <span>
                              {new Date(sub.created_at).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          {sub.error ? (
                            <pre className="text-destructive mt-1 max-h-20 overflow-auto text-xs whitespace-pre-wrap">
                              {sub.error}
                            </pre>
                          ) : null}
                          {sub.output ? (
                            <pre className="bg-muted mt-1 max-h-20 overflow-auto rounded p-1 text-xs whitespace-pre-wrap">
                              {sub.output}
                            </pre>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Không có dữ liệu.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
