import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Dùng trong Route Handlers: session cookie + profiles.role = admin.
 * Một số thao tác (vd. POST /api/admin/sync-learning-paths) sau khi pass cần
 * `createServiceRoleClient()` để ghi hộ user khác (learning_paths).
 */
export async function getAdminSupabase(): Promise<
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (profile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Chỉ admin mới thực hiện được." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, supabase };
}
