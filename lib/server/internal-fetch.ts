import { getSiteOrigin } from "@/lib/site-origin";
import { cookies, headers } from "next/headers";

/** Gọi API route cùng origin trong Server Component (kèm cookie phiên). */
export async function fetchInternalApi(path: string): Promise<Response> {
  const h = await headers();
  const cookieStore = cookies();
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  const baseUrl = forwardedHost
    ? `${h.get("x-forwarded-proto") ?? "http"}://${forwardedHost}`
    : getSiteOrigin();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    cache: "no-store",
  });
}
