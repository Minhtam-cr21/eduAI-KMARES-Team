import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  feedbackText: z.string().min(1).max(4000),
  suggestedChanges: z.string().max(8000).optional(),
});

type Ctx = { params: { pathId: string } };

/** POST — học sinh góp ý → revision_requested. */
export async function POST(request: Request, { params }: Ctx) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const pathId = params.pathId;
  const { data: path, error: fetchErr } = await supabase
    .from("personalized_paths")
    .select("id, student_id, status")
    .eq("id", pathId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!path || path.student_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (path.status !== "pending_student_approval") {
    return NextResponse.json(
      { error: "Chỉ góp ý khi lộ trình đang chờ bạn xác nhận." },
      { status: 400 }
    );
  }

  const extra = parsed.data.suggestedChanges
    ? `\n\nĐề xuất chỉnh sửa:\n${parsed.data.suggestedChanges}`
    : "";

  const { error: upErr } = await supabase
    .from("personalized_paths")
    .update({
      status: "revision_requested",
      student_feedback: `${parsed.data.feedbackText}${extra}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pathId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
