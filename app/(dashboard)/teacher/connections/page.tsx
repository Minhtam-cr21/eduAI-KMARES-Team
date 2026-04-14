import {
  TeacherConnectionsManager,
  type ConnectionRow,
} from "@/components/teacher/teacher-connections-manager";
import { fetchInternalApi } from "@/lib/server/internal-fetch";

export default async function TeacherConnectionsPage() {
  const res = await fetchInternalApi("/api/teacher/connection-requests");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return (
      <div>
        <p className="text-destructive text-sm">
          {err.error ?? `Lỗi ${res.status}`}
        </p>
      </div>
    );
  }

  const initialRows = (await res.json()) as ConnectionRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Yêu cầu kết nối
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Phản hồi yêu cầu từ học sinh. Email thông báo phụ thuộc cấu hình Resend (nếu có).
        </p>
      </div>
      <TeacherConnectionsManager initialRows={initialRows} />
    </div>
  );
}
