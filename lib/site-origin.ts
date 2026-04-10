/**
 * Origin công khai của app (OAuth redirect, email xác nhận, callback).
 * Production: đặt NEXT_PUBLIC_APP_URL trên Vercel (vd: https://edu-ai-kmares-team.vercel.app).
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
