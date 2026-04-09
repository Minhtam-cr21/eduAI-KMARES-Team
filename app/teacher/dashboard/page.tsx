import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giáo viên | EduAI",
  description: "Theo dõi tiến độ học sinh",
};

export default function TeacherDashboardPage() {
  redirect("/teacher");
}
