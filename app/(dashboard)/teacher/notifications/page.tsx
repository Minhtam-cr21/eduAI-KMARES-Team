import { TeacherNotificationsPageClient } from "@/components/teacher/teacher-notifications-page-client";

export const dynamic = "force-dynamic";

export default function TeacherNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Thông báo
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cập nhật từ hệ thống và học sinh.
        </p>
      </div>
      <TeacherNotificationsPageClient />
    </div>
  );
}
