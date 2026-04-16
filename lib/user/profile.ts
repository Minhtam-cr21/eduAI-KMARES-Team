import type { SupabaseClient } from "@supabase/supabase-js";

export type UserProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
};

export async function loadUserProfileSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileSummary | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    full_name: (data.full_name as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
  };
}
