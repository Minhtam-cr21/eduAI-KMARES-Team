import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/runtime/env";

/** Client Supabase cho trình duyệt (OAuth, tương tác cần `window`). */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(
    url,
    anonKey
  );
}
