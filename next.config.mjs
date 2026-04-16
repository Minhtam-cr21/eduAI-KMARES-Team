/** @type {import('next').NextConfig} */

/**
 * On Vercel, env vars without NEXT_PUBLIC_ are not inlined into the browser bundle.
 * Teams often set SUPABASE_URL + SUPABASE_ANON_KEY only; the client then throws RuntimeEnvError.
 * Map URL + anon key into NEXT_PUBLIC_* at build time. Never map service_role here.
 */
function firstNonEmpty(...values) {
  for (const raw of values) {
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v) return v;
  }
  return undefined;
}

const resolvedSupabaseUrl = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL
);

const resolvedSupabaseAnonKey = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY
);

const nextConfig = {
  env: {
    ...(resolvedSupabaseUrl
      ? { NEXT_PUBLIC_SUPABASE_URL: resolvedSupabaseUrl }
      : {}),
    ...(resolvedSupabaseAnonKey
      ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvedSupabaseAnonKey }
      : {}),
  },
};

export default nextConfig;
