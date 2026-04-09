import { ExercisesAdminClient } from "@/components/admin/exercises-admin-client";
import { requireAdmin } from "@/lib/auth/require-admin";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bài tập (lesson) | EduAI Admin",
};

export default async function AdminLessonExercisesPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const { lessonId } = params;
  await requireAdmin(`/admin/lessons/${lessonId}/exercises`);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <p className="text-muted-foreground text-sm">
        <Link
          href="/admin/topics"
          className="text-primary underline-offset-4 hover:underline"
        >
          ← Admin
        </Link>
      </p>
      <ExercisesAdminClient lessonId={lessonId} />
    </main>
  );
}
