import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase cho trình duyệt (OAuth, tương tác cần `window`). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
