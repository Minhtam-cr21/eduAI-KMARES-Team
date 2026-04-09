"use client";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ConnectionRequest } from "@/types/database";
import { Send, Users } from "lucide-react";
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

function ConnectionSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export default function StudentConnectionsPage() {
  const [rows, setRows] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState("");
  const [goal, setGoal] = useState("");
  const [available, setAvailable] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connection-requests/student");
      const data = (await res.json()) as
        | ConnectionRequest[]
        | { error?: string };
      if (!res.ok) {
        toast.error("Không tải được yêu cầu", {
          description:
            typeof data === "object" && data && "error" in data
              ? String((data as { error?: string }).error)
              : res.statusText,
        });
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/connection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId.trim(),
          goal: goal.trim(),
          available_time: available.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Không gửi được", { description: data.error });
        return;
      }
      toast.success("Đã gửi yêu cầu.");
      setTeacherId("");
      setGoal("");
      setAvailable("");
      await load();
    } catch (err) {
      toast.error("Lỗi mạng", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kết nối giáo viên</h1>
          <p className="text-sm text-muted-foreground">
            Gửi yêu cầu kết nối đến giáo viên để được hướng dẫn 1:1.
          </p>
        </div>
      </div>

      <Card className="mb-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Gửi yêu cầu mới
          </CardTitle>
          <CardDescription>
            Nhập UUID giáo viên (từ khóa học hoặc admin cung cấp).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="teacher-id">Teacher ID (UUID)</Label>
              <Input
                id="teacher-id"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Mục tiêu</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ví dụ: Muốn học Python từ cơ bản, cần hỗ trợ thuật toán..."
                className="min-h-[80px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available">Thời gian rảnh (tuỳ chọn)</Label>
              <Input
                id="available"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                placeholder="Ví dụ: Tối T2-T6, 19:00-21:00"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className={cn(
                "rounded-lg px-5 py-2.5 text-sm font-semibold transition",
                "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              )}
            >
              {sending ? "Đang gửi…" : "Gửi yêu cầu"}
            </button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-foreground">Yêu cầu đã gửi</h2>

      {loading ? (
        <ConnectionSkeleton />
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có yêu cầu nào.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="transition hover:shadow-md">
              <CardContent className="pt-4">
                <div className="mb-2 flex items-start justify-between gap-2">
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
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {r.goal}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  GV: {r.teacher_id?.slice(0, 8)}…
                </p>
                {r.teacher_response ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Phản hồi: {r.teacher_response}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
