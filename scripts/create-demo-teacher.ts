/**
 * Tạo đúng MỘT tài khoản giáo viên demo (idempotent: chạy lại sẽ reset mật khẩu + role).
 *
 * Cần trong .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Đăng nhập tại /login:
 *   Email:    giaovien123@giaovien.local   (Supabase yêu cầu email hợp lệ; đây là tài khoản "giaovien123")
 *   Mật khẩu: giaovien123
 *   Chọn vai trò: Giáo viên
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "giaovien123@giaovien.local";
const DEMO_PASSWORD = "giaovien123";
const DISPLAY_NAME = "Giáo viên (demo)";

function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* skip */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "[create-demo-teacher] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function findAuthUserIdByEmail(
  client: SupabaseClient,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[create-demo-teacher] listUsers:", error.message);
      return null;
    }
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  let userId = await findAuthUserIdByEmail(supabase, DEMO_EMAIL);

  if (userId) {
    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DISPLAY_NAME },
    });
    if (updErr) {
      console.error("[create-demo-teacher] updateUser:", updErr.message);
      process.exit(1);
    }
    console.log("[create-demo-teacher] Đã cập nhật user có sẵn:", userId);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DISPLAY_NAME },
    });
    if (error || !data.user) {
      console.error("[create-demo-teacher] createUser:", error?.message ?? "no user");
      process.exit(1);
    }
    userId = data.user.id;
    console.log("[create-demo-teacher] Đã tạo user mới:", userId);
  }

  const { error: profErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: DISPLAY_NAME,
      role: "teacher",
    },
    { onConflict: "id" }
  );
  if (profErr) {
    console.error("[create-demo-teacher] profiles upsert:", profErr.message);
    process.exit(1);
  }

  console.log("");
  console.log("--- Đăng nhập ---");
  console.log("URL:      /login");
  console.log("Email:   ", DEMO_EMAIL);
  console.log("Mật khẩu:", DEMO_PASSWORD);
  console.log("Vai trò:  Giáo viên (teacher)");
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
