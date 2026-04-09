import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  status: z.enum(["published", "rejected"]),
  rejection_reason: z.string().optional().nullable(),
});

/** PUT — admin duyệt / từ chối bài học. */
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

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, rejection_reason } = parsed.data;

  const { data, error } = await admin.supabase
    .from("course_lessons")
    .update({
      status,
      rejection_reason:
        status === "rejected" ? (rejection_reason ?? null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
