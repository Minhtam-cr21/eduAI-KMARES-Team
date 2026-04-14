import { TeacherLayoutShell } from "@/components/teacher/teacher-layout-shell";
import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import { segmentMetadata } from "@/lib/seo/shared-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = segmentMetadata({
  title: "Giáo viên",
  description:
    "Không gian quản lý khóa học, học sinh, lộ trình cá nhân hóa và lộ trình AI cho giáo viên EduAI.",
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
