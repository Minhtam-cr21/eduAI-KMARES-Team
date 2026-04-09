import { TeacherDashboardClient } from "@/components/teacher/teacher-dashboard-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giáo viên | EduAI",
  description: "Theo dõi tiến độ học sinh",
};

export default function TeacherDashboardPage() {
  return <TeacherDashboardClient />;
}
