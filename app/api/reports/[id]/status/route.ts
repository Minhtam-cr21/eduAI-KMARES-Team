import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  status: z.enum(["pending", "resolved", "rejected"]),
  admin_note: z.string().optional().nullable(),
});

/** PUT — admin cập nhật trạng thái báo cáo. */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, admin_note } = parsed.data;

  const { data, error } = await admin.supabase
    .from("reports")
    .update({
      status,
      admin_note: admin_note ?? null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
