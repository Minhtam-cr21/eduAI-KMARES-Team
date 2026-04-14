import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { pathId: string } };

/** PUT — giáo viên / admin hủy lộ trình (status → cancelled). */
export async function PUT(_request: Request, { params }: Ctx) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;
  const pathId = params.pathId;

  const { data: path, error: fetchErr } = await supabase
    .from("personalized_paths")
    .select("id, teacher_id, status")
    .eq("id", pathId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (me?.role !== "admin" && path.teacher_id !== userId) {
    return NextResponse.json(
      { error: "You can only cancel paths you manage" },
      { status: 403 }
    );
  }

  const st = path.status as string;
  if (st !== "active" && st !== "paused") {
    return NextResponse.json(
      { error: "Chỉ có thể hủy lộ trình đang active hoặc paused." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("personalized_paths")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pathId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
