import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — admin xem khóa học chờ duyệt. */
export async function GET() {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { data, error } = await admin.supabase
    .from("courses")
    .select("*, profiles(id, full_name, avatar_url)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row: Record<string, unknown>) => {
    const { profiles: prof, ...rest } = row;
    return { ...rest, teacher: prof ?? null };
  });

  return NextResponse.json(rows);
}
