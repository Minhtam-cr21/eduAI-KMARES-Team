import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  role: z.enum(["student", "teacher", "admin"]),
});

/** PUT — cập nhật role người dùng (admin). */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const supabase = admin.supabase;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nextRole = parsed.data.role;
  const targetId = params.id;

  const { data: target, error: targetErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (targetErr) {
    return NextResponse.json({ error: targetErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
  }

  if (target.role === "admin" && nextRole !== "admin") {
    const { count, error: countErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Không thể bỏ vai trò admin của tài khoản admin duy nhất." },
        { status: 400 }
      );
    }
  }

  const { data: updated, error: updErr } = await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", targetId)
    .select()
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
