import { TeacherLayoutShell } from "@/components/teacher/teacher-layout-shell";
import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import { segmentMetadata } from "@/lib/seo/shared-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = segmentMetadata({
  title: "Giáo viên",
  description:
    "Workspace giáo viên EduAI: tổng quan, khóa học, học sinh, duyệt lộ trình, lịch học can thiệp và thông báo.",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacherOrAdmin("/teacher");

  return <TeacherLayoutShell>{children}</TeacherLayoutShell>;
}
