/**
 * Kiểm tra nhanh biến môi trường + kết nối Supabase (service role) trước khi deploy.
 * Chạy: npm run test:flow
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
    /* missing */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function need(name: string): boolean {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`[test-flow] Thiếu ${name}`);
    return false;
  }
  return true;
}

async function main() {
  let ok = true;
  ok = need("NEXT_PUBLIC_SUPABASE_URL") && ok;
  ok = need("NEXT_PUBLIC_SUPABASE_ANON_KEY") && ok;
  const sr =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_JWT_KEY?.trim();
  if (!sr) {
    console.error("[test-flow] Thiếu SUPABASE_SERVICE_ROLE_KEY");
    ok = false;
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn(
      "[test-flow] RESEND_API_KEY chưa set — email (Resend) sẽ bị bỏ qua trên server."
    );
  }

  if (!ok) {
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const admin = createClient(url, sr!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.from("courses").select("id").limit(1);
  if (error) {
    console.error("[test-flow] courses select:", error.message);
    process.exit(1);
  }

  console.log("[test-flow] OK — env + đọc courses (service role).");
}

void main();
