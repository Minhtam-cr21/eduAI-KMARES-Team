import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Duyệt / từ chối — chỉ cập nhật custom_roadmaps (không tạo personalized_paths tự động). */
const patchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  teacher_feedback: z.string().max(4000).optional().nullable(),
  /** Dự phòng: sau này bật tạo path tự động; hiện bỏ qua. */
  autoPersonalizedPath: z.boolean().optional(),
});

type Ctx = { params: { id: string } };

export async function GET(_request: Request, { params }: Ctx) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data: row, error } = await gate.supabase
    .from("custom_roadmaps")
    .select(
      "id, user_id, title, modules, total_duration_days, reasoning, status, teacher_feedback, created_at, updated_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: profile } = await gate.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", row.user_id as string)
    .maybeSingle();

  return NextResponse.json({
    roadmap: row,
    student_name: (profile?.full_name as string | null) ?? null,
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: current, error: curErr } = await gate.supabase
    .from("custom_roadmaps")
    .select("status")
    .eq("id", params.id)
    .maybeSingle();

  if (curErr) {
    return NextResponse.json({ error: curErr.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (current.status !== "pending") {
    return NextResponse.json(
      { error: "Chỉ xử lý được lộ trình đang ở trạng thái chờ duyệt." },
      { status: 400 }
    );
  }

  const { error } = await gate.supabase
    .from("custom_roadmaps")
    .update({
      status: parsed.data.status,
      teacher_feedback: parsed.data.teacher_feedback ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
