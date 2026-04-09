import { LessonsAdminClient } from "@/components/admin/lessons-admin-client";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý bài học | EduAI Admin",
};

export default async function AdminTopicLessonsPage({
  params,
}: {
  params: { topicId: string };
}) {
  const { topicId } = params;

  const { supabase } = await requireAdmin(`/admin/topics/${topicId}/lessons`);

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("id, title")
    .eq("id", topicId)
    .maybeSingle();

  if (topicErr || !topic) {
    notFound();
  }

  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .select(
      "id, topic_id, title, content, video_url, order_index, is_published, goals, created_at"
    )
    .eq("topic_id", topicId)
    .order("order_index", { ascending: true });

  if (lessonsErr) {
    throw new Error(lessonsErr.message);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <LessonsAdminClient
        topicId={topic.id}
        topicTitle={topic.title}
        lessons={lessons ?? []}
      />
    </main>
  );
}
