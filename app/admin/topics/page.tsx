import { TopicsAdminClient } from "@/components/admin/topics-admin-client";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý chủ đề | EduAI Admin",
  description: "CRUD chủ đề khóa học (admin)",
};

/** Luôn render động (session + RLS). */
export const dynamic = "force-dynamic";

/**
 * Trang quản lý `topics`: danh sách + Dialog thêm/sửa, publish/unpublish, xóa.
 * Đường dẫn App Router: `app/admin/topics/page.tsx` → URL `/admin/topics`
 */
export default async function AdminTopicsPage() {
  const { supabase } = await requireAdmin();

  const { data: topics, error } = await supabase
    .from("topics")
    .select(
      "id, title, description, order_index, is_published, created_by, created_at"
    )
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <TopicsAdminClient topics={topics ?? []} />
    </main>
  );
}
