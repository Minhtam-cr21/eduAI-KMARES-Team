import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** DELETE — admin: remove course and dependent rows (CASCADE). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await getAdminSupabase();
  if (!gate.ok) return gate.response;

  let adminDb;
  try {
    adminDb = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role unavailable";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { error } = await adminDb.from("courses").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
