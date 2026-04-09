"use server";

import { createClient } from "@/lib/supabase/server";
import {
  topicFormSchema,
  topicUpdateSchema,
} from "@/lib/validations/topic";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
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

export type TopicMutationResult = { ok: true } | { ok: false; error: string };

export async function createTopicAction(
  input: unknown
): Promise<TopicMutationResult> {
  console.log("[topics] createTopicAction raw:", JSON.stringify(input));

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const parsed = topicFormSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[topics] createTopicAction zod:", parsed.error.flatten());
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const { error } = await guard.supabase.from("topics").insert({
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim() || null,
    order_index: parsed.data.order_index,
    is_published: parsed.data.is_published,
    created_by: guard.userId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/topics");
  return { ok: true };
}

export async function updateTopicAction(
  input: unknown
): Promise<TopicMutationResult> {
  console.log("[topics] updateTopicAction raw:", JSON.stringify(input));

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const parsed = topicUpdateSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[topics] updateTopicAction zod:", parsed.error.flatten());
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const { id, ...rest } = parsed.data;
  const { error } = await guard.supabase
    .from("topics")
    .update({
      title: rest.title.trim(),
      description: rest.description.trim() || null,
      order_index: rest.order_index,
      is_published: rest.is_published,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/topics");
  return { ok: true };
}

export async function deleteTopicAction(
  id: unknown
): Promise<TopicMutationResult> {
  console.log("[topics] deleteTopicAction raw id:", id, "type:", typeof id);

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const idParsed = z.string().uuid("Cần id topic dạng UUID hợp lệ").safeParse(id);
  if (!idParsed.success) {
    console.error("[topics] deleteTopicAction zod:", idParsed.error.flatten());
    return { ok: false, error: formatZodError(idParsed.error) };
  }

  const { error } = await guard.supabase
    .from("topics")
    .delete()
    .eq("id", idParsed.data);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/topics");
  return { ok: true };
}

export async function setTopicPublishedAction(
  id: unknown,
  is_published: boolean
): Promise<TopicMutationResult> {
  console.log("[topics] setTopicPublishedAction id:", id, "is_published:", is_published);

  const guard = await assertAdminAction();
  if (!guard.ok) {
    return { ok: false, error: guard.message };
  }

  const idParsed = z.string().uuid("Cần id topic dạng UUID hợp lệ").safeParse(id);
  if (!idParsed.success) {
    return { ok: false, error: formatZodError(idParsed.error) };
  }

  const { error } = await guard.supabase
    .from("topics")
    .update({ is_published })
    .eq("id", idParsed.data);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/topics");
  return { ok: true };
}
