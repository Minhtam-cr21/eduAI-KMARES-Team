"use server";

import { revalidateAdminLessonPaths } from "@/lib/admin/revalidate-lessons";
import { createClient } from "@/lib/supabase/server";
import {
  lessonFormSchema,
  lessonUpdateSchema,
} from "@/lib/validations/lesson";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

type Guard =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; message: string };

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.length ? `${i.path.join(".")}: ` : "";
      return `${path}${i.message}`;
    })
    .join(" • ");
}

async function assertAdminAction(): Promise<Guard> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Chưa đăng nhập." };
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return { ok: false, message: error.message };
  }
  if (profile?.role !== "admin") {
    return { ok: false, message: "Chỉ admin mới thực hiện được thao tác này." };
  }
  return { ok: true, supabase, userId: user.id };
}

export type LessonMutationResult = { ok: true } | { ok: false; error: string };

export async function createLessonAction(
  topicId: unknown,
  formData: unknown
): Promise<LessonMutationResult> {
  console.log("[lessons] createLessonAction topicId:", topicId, "raw:", JSON.stringify(formData));

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const topicParsed = z.string().uuid("topicId không hợp lệ").safeParse(topicId);
  if (!topicParsed.success) {
    return { ok: false, error: formatZodError(topicParsed.error) };
  }

  const parsed = lessonFormSchema.safeParse(formData);
  if (!parsed.success) {
    console.error("[lessons] createLessonAction zod:", parsed.error.flatten());
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const { error } = await guard.supabase.from("lessons").insert({
    topic_id: topicParsed.data,
    title: parsed.data.title.trim(),
    content: parsed.data.content.trim() || null,
    video_url: parsed.data.video_url?.trim() || null,
    order_index: parsed.data.order_index,
    is_published: parsed.data.is_published,
    goals: parsed.data.goals?.length ? parsed.data.goals : [],
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidateAdminLessonPaths(topicParsed.data);
  return { ok: true };
}

export async function updateLessonAction(
  lessonId: unknown,
  formData: unknown
): Promise<LessonMutationResult> {
  console.log("[lessons] updateLessonAction lessonId:", lessonId, "raw:", JSON.stringify(formData));

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const idParsed = z.string().uuid("lessonId không hợp lệ").safeParse(lessonId);
  if (!idParsed.success) {
    return { ok: false, error: formatZodError(idParsed.error) };
  }

  const merged = {
    ...(typeof formData === "object" && formData !== null ? formData : {}),
    id: idParsed.data,
  };
  const parsed = lessonUpdateSchema.safeParse(merged);
  if (!parsed.success) {
    console.error("[lessons] updateLessonAction zod:", parsed.error.flatten());
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const { id, ...rest } = parsed.data;
  const { data: existing, error: fetchErr } = await guard.supabase
    .from("lessons")
    .select("topic_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing?.topic_id) {
    return { ok: false, error: fetchErr?.message ?? "Không tìm thấy bài học." };
  }

  const { error } = await guard.supabase
    .from("lessons")
    .update({
      title: rest.title.trim(),
      content: rest.content.trim() || null,
      video_url: rest.video_url?.trim() || null,
      order_index: rest.order_index,
      is_published: rest.is_published,
      goals: rest.goals?.length ? rest.goals : [],
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidateAdminLessonPaths(existing.topic_id);
  return { ok: true };
}

export async function deleteLessonAction(
  lessonId: unknown
): Promise<LessonMutationResult> {
  console.log("[lessons] deleteLessonAction lessonId:", lessonId);

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const idParsed = z.string().uuid("lessonId không hợp lệ").safeParse(lessonId);
  if (!idParsed.success) {
    return { ok: false, error: formatZodError(idParsed.error) };
  }

  const { data: existing, error: fetchErr } = await guard.supabase
    .from("lessons")
    .select("topic_id")
    .eq("id", idParsed.data)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }
  if (!existing?.topic_id) {
    return { ok: false, error: "Không tìm thấy bài học." };
  }

  const { error } = await guard.supabase
    .from("lessons")
    .delete()
    .eq("id", idParsed.data);

  if (error) {
    return { ok: false, error: error.message };
  }
  if (existing?.topic_id) {
    revalidateAdminLessonPaths(existing.topic_id);
  }
  return { ok: true };
}

export async function setLessonPublishedAction(
  lessonId: unknown,
  isPublished: boolean
): Promise<LessonMutationResult> {
  console.log("[lessons] setLessonPublishedAction", lessonId, isPublished);

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const idParsed = z.string().uuid("lessonId không hợp lệ").safeParse(lessonId);
  if (!idParsed.success) {
    return { ok: false, error: formatZodError(idParsed.error) };
  }

  const { data: existing, error: fetchErr } = await guard.supabase
    .from("lessons")
    .select("topic_id")
    .eq("id", idParsed.data)
    .maybeSingle();

  if (fetchErr || !existing?.topic_id) {
    return { ok: false, error: fetchErr?.message ?? "Không tìm thấy bài học." };
  }

  const { error } = await guard.supabase
    .from("lessons")
    .update({ is_published: isPublished })
    .eq("id", idParsed.data);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidateAdminLessonPaths(existing.topic_id);
  return { ok: true };
}
