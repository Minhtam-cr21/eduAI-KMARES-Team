import { cookies, headers } from "next/headers";

/** Gọi API route cùng origin trong Server Component (kèm cookie phiên). */
export async function fetchInternalApi(path: string): Promise<Response> {
  const h = await headers();
  const cookieStore = cookies();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const url = `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    cache: "no-store",
  });
}
