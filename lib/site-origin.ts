import type { NextRequest } from "next/server";

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

/**
 * Trên browser, auth redirect/callback nên ưu tiên đúng origin hiện tại
 * (preview/custom domain trên Vercel) thay vì cố ép canonical env URL.
 */
export function getBrowserSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return getSiteOrigin();
}

/**
 * Origin của **request hiện tại** — dùng cho redirect sau `/auth/callback`.
 * Tránh redirect sang host khác `NEXT_PUBLIC_APP_URL` (custom domain, preview Vercel)
 * khiến cookie session không khớp domain → không giữ đăng nhập.
 */
export function getRequestOrigin(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  if (forwarded) {
    const host = forwarded.split(",")[0]!.trim();
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}
