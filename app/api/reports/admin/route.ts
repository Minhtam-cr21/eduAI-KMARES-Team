import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — admin xem báo cáo (?status=pending|resolved|rejected). */
export async function GET(request: NextRequest) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = admin.supabase.from("reports").select("*");
  if (status && ["pending", "resolved", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
