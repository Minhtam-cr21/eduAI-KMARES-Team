"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionRequest } from "@/types/database";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
      const data = (await res.json()) as ConnectionRequest[] | { error?: string };
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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Kết nối giáo viên
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nhập UUID giáo viên (từ khóa học / admin). Chỉ tài khoản học sinh
            mới gửi được.
          </p>
        </div>
        <Link
          href="/student"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Hub
        </Link>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mb-10 space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <div>
          <label className="text-sm font-medium">teacher_id (UUID)</label>
          <input
            className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Mục tiêu</label>
          <textarea
            className="border-input bg-background mt-1 min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Thời gian rảnh (tuỳ chọn)</label>
          <input
            className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={available}
            onChange={(e) => setAvailable(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          {sending ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
      </form>

      <h2 className="mb-2 text-lg font-semibold">Yêu cầu đã gửi</h2>
      {loading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có yêu cầu.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="font-medium">{r.status}</span>
              <span className="text-muted-foreground"> · </span>
              <span>{r.goal}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
