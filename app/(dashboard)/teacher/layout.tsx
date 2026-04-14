import { TeacherLayoutShell } from "@/components/teacher/teacher-layout-shell";
import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacherOrAdmin("/teacher");

  return <TeacherLayoutShell>{children}</TeacherLayoutShell>;
}
