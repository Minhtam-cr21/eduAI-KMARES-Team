import { sendTeacherConnectionResponseEmail } from "@/lib/email/send";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const respondSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  teacher_response: z.string().optional().nullable(),
});

/** PUT — giáo viên chấp nhận / từ chối yêu cầu. */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("connection_requests")
    .select("teacher_id, status, student_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.teacher_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Already responded" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, teacher_response } = parsed.data;

  if (status === "accepted" && !teacher_response?.trim()) {
    return NextResponse.json(
      { error: "teacher_response required when accepting" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("connection_requests")
    .update({
      status,
      teacher_response: teacher_response ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data: authUser } = await admin.auth.admin.getUserById(
      row.student_id as string
    );
    const email = authUser.user?.email?.trim();
    if (email) {
      const { data: teacherProf } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const teacherName =
        (teacherProf?.full_name as string | null)?.trim() || "Giáo viên";
      await sendTeacherConnectionResponseEmail(email, {
        teacherName,
        status,
        teacherResponse: teacher_response ?? null,
      });
    }
  } catch (e) {
    console.warn("[connection respond] email skip:", e);
  }

  return NextResponse.json(data);
}
