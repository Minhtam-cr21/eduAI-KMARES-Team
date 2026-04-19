/**
 * Tạo 3 tài khoản demo cho EduAI (idempotent: chạy lại sẽ reset mật khẩu + role).
 *
 * Cần trong .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Chạy: npx tsx scripts/create-demo-accounts.ts
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  VAI TRÒ   │  EMAIL                        │  MẬT KHẨU                 │
 * ├────────────┼───────────────────────────────┼────────────────────────────┤
 * │  Học sinh  │  hocsinh@demo.eduai.local     │  Demo@123456               │
 * │  Giáo viên │  giaovien@demo.eduai.local    │  Demo@123456               │
 * │  Admin     │  admin@demo.eduai.local       │  Demo@123456               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ────────────────────────────────────────────────────────────────
// Danh sách tài khoản demo
// ────────────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  {
    email: "hocsinh@demo.eduai.local",
    password: "Demo@123456",
    full_name: "Học Sinh (Demo)",
    role: "student" as const,
  },
  {
    email: "giaovien@demo.eduai.local",
    password: "Demo@123456",
    full_name: "Giáo Viên (Demo)",
    role: "teacher" as const,
  },
  {
    email: "admin@demo.eduai.local",
    password: "Demo@123456",
    full_name: "Admin (Demo)",
    role: "admin" as const,
  },
];

// ────────────────────────────────────────────────────────────────
// Load .env.local / .env
// ────────────────────────────────────────────────────────────────
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
    "❌  Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ────────────────────────────────────────────────────────────────
// Tiện ích tìm user theo email
// ────────────────────────────────────────────────────────────────
async function findUserId(
  client: SupabaseClient,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("  listUsers:", error.message);
      return null;
    }
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// Tạo / cập nhật một tài khoản demo
// ────────────────────────────────────────────────────────────────
async function upsertDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
  const { email, password, full_name, role } = account;
  console.log(`\n🔧  [${role.toUpperCase()}] ${email}`);

  let userId = await findUserId(supabase, email);

  if (userId) {
    // Cập nhật mật khẩu + metadata nếu user đã tồn tại
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) {
      console.error(`  ❌  updateUser: ${error.message}`);
      return;
    }
    console.log(`  ✅  Đã cập nhật auth user: ${userId}`);
  } else {
    // Tạo mới
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error || !data.user) {
      console.error(`  ❌  createUser: ${error?.message ?? "no user returned"}`);
      return;
    }
    userId = data.user.id;
    console.log(`  ✅  Đã tạo auth user mới: ${userId}`);
  }

  // Upsert profile với đúng role
  const { error: profErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name,
      role,
    },
    { onConflict: "id" }
  );
  if (profErr) {
    console.error(`  ❌  profiles upsert: ${profErr.message}`);
    return;
  }
  console.log(`  ✅  Profile role="${role}" đã được ghi vào DB`);
}

// ────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("   EduAI — Tạo tài khoản DEMO                     ");
  console.log("═══════════════════════════════════════════════════");

  for (const account of DEMO_ACCOUNTS) {
    await upsertDemoAccount(account);
  }

  console.log("\n\n╔═════════════════════════════════════════════════╗");
  console.log("║          THÔNG TIN ĐĂNG NHẬP DEMO               ║");
  console.log("╠══════════════╦══════════════════════════════════╗");
  console.log("║ Vai trò      ║ Email / Mật khẩu                 ║");
  console.log("╠══════════════╬══════════════════════════════════╣");
  console.log("║ Học sinh     ║ hocsinh@demo.eduai.local         ║");
  console.log("║              ║ Demo@123456                      ║");
  console.log("╠══════════════╬══════════════════════════════════╣");
  console.log("║ Giáo viên    ║ giaovien@demo.eduai.local        ║");
  console.log("║              ║ Demo@123456                      ║");
  console.log("╠══════════════╬══════════════════════════════════╣");
  console.log("║ Admin        ║ admin@demo.eduai.local           ║");
  console.log("║              ║ Demo@123456                      ║");
  console.log("╚══════════════╩══════════════════════════════════╝");
  console.log("\n⚠️  Chỉ dùng cho môi trường DEV/Staging. Không dùng trên Production!\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
