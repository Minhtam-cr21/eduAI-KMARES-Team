import { createClient } from "@supabase/supabase-js";

/**
 * Ưu tiên: SUPABASE_SERVICE_ROLE_KEY, sau đó SUPABASE_SERVICE_ROLE_JWT_KEY (cùng ý nghĩa).
 * Giá trị phải là API key **service_role** (Dashboard → Settings → API → Legacy API keys: JWT `eyJ…`),
 * hoặc Secret key dạng `sb_secret_…` — KHÔNG phải "JWT Secret" / Signing secret ở mục Settings → JWT.
 */
function resolveServiceRoleKey(): string | undefined {
  const raw =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_JWT_KEY;
  const key = raw?.trim();
  return key || undefined;
}

/** Legacy JWT (`eyJ…`) hoặc secret key nền tảng (`sb_secret_…`). */
function looksLikeSupabaseElevatedApiKey(key: string): boolean {
  return key.startsWith("eyJ") || key.startsWith("sb_secret_");
}

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = resolveServiceRoleKey();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  if (!key) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY (hoặc SUPABASE_SERVICE_ROLE_JWT_KEY). " +
        "Lấy key **service_role** tại Dashboard → Project Settings → API → Legacy API keys."
    );
  }

  if (!looksLikeSupabaseElevatedApiKey(key)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY không đúng loại: có vẻ bạn đã dán **JWT Secret** (ký token) " +
        "thay vì API key **service_role**. Vào Settings → **API** → Legacy API keys → copy " +
        "**service_role** (chuỗi bắt đầu eyJ…), hoặc Secret key sb_secret_… — không dùng secret ở Settings → JWT."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
