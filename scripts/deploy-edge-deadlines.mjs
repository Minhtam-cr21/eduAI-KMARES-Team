/**
 * Deploy Edge Function `handle-missed-deadlines` + đặt secrets trên Supabase Cloud.
 *
 * 1. cp env.supabase.deploy.example .env.supabase.deploy
 * 2. Điền giá trị (PROJECT_REF, ACCESS_TOKEN, SERVICE_ROLE, RESEND)
 * 3. npm run supabase:deploy:deadlines
 */
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

const envPath = resolve(process.cwd(), ".env.supabase.deploy");
if (!existsSync(envPath)) {
  console.error(
    "[deploy] Thiếu .env.supabase.deploy — sao chép từ env.supabase.deploy.example và điền giá trị."
  );
  process.exit(1);
}

/** @type {Record<string, string>} */
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const required = [
  "SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
];
for (const k of required) {
  if (!env[k]) {
    console.error(`[deploy] Thiếu biến bắt buộc trong .env.supabase.deploy: ${k}`);
    process.exit(1);
  }
}

const projectRef = env.SUPABASE_PROJECT_REF;
const childEnv = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN,
};

function q(v) {
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const tmpSecrets = resolve(
  tmpdir(),
  `supabase-edge-secrets-${process.pid}-${Date.now()}.env`
);

const secretLines = [
  `SUPABASE_SERVICE_ROLE_KEY=${q(env.SUPABASE_SERVICE_ROLE_KEY)}`,
  `RESEND_API_KEY=${q(env.RESEND_API_KEY)}`,
];
if (env.RESEND_FROM_EMAIL?.trim()) {
  secretLines.push(`RESEND_FROM_EMAIL=${q(env.RESEND_FROM_EMAIL.trim())}`);
}
writeFileSync(tmpSecrets, secretLines.join("\n") + "\n", "utf8");

try {
  console.log("[deploy] Deploy function handle-missed-deadlines …");
  execSync(
    `npx supabase functions deploy handle-missed-deadlines --project-ref ${projectRef}`,
    { stdio: "inherit", env: childEnv, cwd: process.cwd(), shell: true }
  );

  console.log("[deploy] Đặt secrets (service_role, Resend) …");
  execSync(
    `npx supabase secrets set --env-file "${tmpSecrets}" --project-ref ${projectRef}`,
    { stdio: "inherit", env: childEnv, cwd: process.cwd(), shell: true }
  );
} finally {
  try {
    unlinkSync(tmpSecrets);
  } catch {
    /* ignore */
  }
}

console.log(
  "[deploy] Xong. Cron: push workflow GitHub (secrets ANON + REF) hoặc Supabase Dashboard → Integrations → Cron."
);
