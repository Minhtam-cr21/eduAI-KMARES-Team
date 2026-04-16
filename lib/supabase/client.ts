import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/runtime/env";

export function createClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createSupabaseClient(
    url,
    anonKey
  );
}
