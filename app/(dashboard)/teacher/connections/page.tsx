import {
  TeacherConnectionsManager,
  type ConnectionRow,
} from "@/components/teacher/teacher-connections-manager";
import { fetchInternalApi } from "@/lib/server/internal-fetch";
import Link from "next/link";

export default async function TeacherConnectionsPage() {
  const res = await fetchInternalApi("/api/teacher/connection-requests");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-destructive text-sm">
          {err.error ?? `Lỗi ${res.status}`}
        </p>
      </div>
    );
  }

  const initialRows = (await res.json()) as ConnectionRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Yêu cầu kết nối</h1>
          <p className="text-muted-foreground text-sm">
            Phản hồi yêu cầu từ học sinh.
          </p>
        </div>
        <Link
          href="/teacher"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Tổng quan
        </Link>
      </div>
      <TeacherConnectionsManager initialRows={initialRows} />
    </div>
  );
}
