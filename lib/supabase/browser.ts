import { createBrowserClient } from "@supabase/ssr";

// (1) Gan tinh truc tiep — khong dung mang hay vong lap.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// (2) Kiem tra bien truoc khi khoi tao.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env hoặc cấu hình trên Vercel."
  );
}

// (3) createBrowserClient (@supabase/ssr).
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export function createSupabaseBrowserClient() {
  return supabase;
}
