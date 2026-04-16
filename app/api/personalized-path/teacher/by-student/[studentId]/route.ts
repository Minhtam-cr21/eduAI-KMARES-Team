import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { loadTeacherPersonalizedPathEditorData } from "@/lib/teacher/personalized-path-editor";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { studentId: string } };

/** GET — chi tiết lộ trình mới nhất của học sinh + gợi ý nếu chưa có. */
export async function GET(_request: Request, { params }: Ctx) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;
  const studentId = params.studentId;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const loaded = await loadTeacherPersonalizedPathEditorData({
    supabase,
    userId,
    studentId,
    isAdmin: me?.role === "admin",
  });
  if (loaded.error || !loaded.data) {
    return NextResponse.json(
      { error: loaded.error ?? "Không tải được dữ liệu lộ trình." },
      { status: loaded.status }
    );
  }

  return NextResponse.json(loaded.data);
}
