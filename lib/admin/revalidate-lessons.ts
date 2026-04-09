import { revalidatePath } from "next/cache";

export function revalidateAdminLessonPaths(topicId: string) {
  revalidatePath(`/admin/topics/${topicId}/lessons`);
  revalidatePath("/admin/topics");
}
