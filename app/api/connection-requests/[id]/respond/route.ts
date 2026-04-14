import { sendConnectionUpdateEmail } from "@/lib/email/send";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const respondSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  teacher_response: z.string().optional().nullable(),
});

async function notifyStudent(
  studentId: string,
  connectionTeacherId: string,
  supabase: SupabaseClient,
  action: Parameters<typeof sendConnectionUpdateEmail>[1]["action"],
  teacherResponse: string | null | undefined
) {
  try {
    const admin = createServiceRoleClient();
    const { data: authUser } = await admin.auth.admin.getUserById(studentId);
    const email = authUser.user?.email?.trim();
    if (!email) return;

    const { data: tp } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", connectionTeacherId)
      .maybeSingle();
    const teacherName =
      (tp?.full_name as string | null)?.trim() || "Giáo viên";

    await sendConnectionUpdateEmail(email, {
      teacherName,
      action,
      teacherResponse: teacherResponse ?? null,
    });
  } catch (e) {
    console.warn("[connection respond] email skip:", e);
  }
}

/** PUT — GV/admin: xử lý pending, hoặc cập nhật link / hủy khi đã accepted. */
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

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = me?.role === "admin";

  const { data: row, error: fetchErr } = await supabase
    .from("connection_requests")
    .select("teacher_id, status, student_id, teacher_response")
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
  if (row.status === "rejected") {
    return NextResponse.json(
      { error: "Yêu cầu đã từ chối, không cập nhật thêm." },
      { status: 400 }
    );
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
  const responseTrim = teacher_response?.trim() ?? null;
  const now = new Date().toISOString();

  const prevStatus = row.status as string;
  const patch: Record<string, unknown> = { last_updated: now };

  let emailAction: Parameters<typeof sendConnectionUpdateEmail>[1]["action"] | null =
    null;

  if (prevStatus === "pending") {
    if (status === "accepted" && !responseTrim) {
      return NextResponse.json(
        { error: "teacher_response required when accepting" },
        { status: 400 }
      );
    }
    patch.status = status;
    patch.teacher_response = responseTrim;
    patch.responded_at = now;
    emailAction = status === "accepted" ? "accepted" : "rejected";
  } else if (prevStatus === "accepted") {
    if (status === "rejected") {
      patch.status = "rejected";
      patch.teacher_response = responseTrim;
      patch.responded_at = now;
      emailAction = "rejected";
    } else if (status === "accepted") {
      if (!responseTrim) {
        return NextResponse.json(
          { error: "teacher_response required when updating link" },
          { status: 400 }
        );
      }
      patch.teacher_response = responseTrim;
      emailAction = "link_updated";
    }
  } else {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("connection_requests")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (emailAction) {
    await notifyStudent(
      row.student_id as string,
      row.teacher_id as string,
      supabase,
      emailAction,
      (patch.teacher_response as string | null) ?? responseTrim
    );
  }

  return NextResponse.json(data);
}
