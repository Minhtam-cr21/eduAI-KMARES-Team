import { sendConnectionUpdateEmail } from "@/lib/email/send";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** DELETE — GV (chủ yêu cầu) hoặc admin xóa bản ghi kết nối. */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = me?.role === "admin";

  const { data: row, error: fetchErr } = await supabase
    .from("connection_requests")
    .select("id, teacher_id, student_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.teacher_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data: authUser } = await admin.auth.admin.getUserById(
      row.student_id as string
    );
    const email = authUser.user?.email?.trim();
    if (email) {
      const { data: tp } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", row.teacher_id as string)
        .maybeSingle();
      const teacherName =
        (tp?.full_name as string | null)?.trim() || "Giáo viên";
      await sendConnectionUpdateEmail(email, {
        teacherName,
        action: "deleted",
      });
    }
  } catch (e) {
    console.warn("[connection delete] email skip:", e);
  }

  const { error: delErr } = await supabase
    .from("connection_requests")
    .delete()
    .eq("id", params.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
