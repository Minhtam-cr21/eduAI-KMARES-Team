import { PracticeQuestionsAdminClient } from "@/components/admin/practice-questions-admin-client";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý câu hỏi luyện tập | EduAI Admin",
};

export default async function AdminPracticeQuestionsPage() {
  await requireAdmin("/admin/practice-questions");

  return (
    <main className="mx-auto max-w-6xl p-6">
      <PracticeQuestionsAdminClient />
    </main>
  );
}
