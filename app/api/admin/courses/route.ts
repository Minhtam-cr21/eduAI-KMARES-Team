import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — admin: all courses (including unpublished). */
export async function GET() {
  const gate = await getAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("courses")
    .select(
      "id, title, category, teacher_id, status, is_published, created_at, profiles(id, full_name)"
    )
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
