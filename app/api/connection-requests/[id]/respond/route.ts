import { sendConnectionUpdateEmail } from "@/lib/email/send";
import { createJitsiMeeting } from "@/lib/meeting/jitsi-room";
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

function buildAcceptedMeeting(now: string) {
  const j = createJitsiMeeting();
  return {
    teacher_response: j.roomId,
    meeting_link: j.meeting_link,
    meeting_code: j.meeting_code,
    responded_at: now,
  };
}

async function notifyStudent(
  studentId: string,
  connectionTeacherId: string,
  supabase: SupabaseClient,
  action: Parameters<typeof sendConnectionUpdateEmail>[1]["action"],
  opts: {
    teacherResponse: string | null;
    meetingLink: string | null;
    meetingCode: string | null;
  }
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
      (tp?.full_name as string | null)?.trim() || "Gi\u00E1o vi\u00EAn";

    await sendConnectionUpdateEmail(email, {
      teacherName,
      action,
      teacherResponse: opts.teacherResponse,
      meetingLink: opts.meetingLink,
      meetingCode: opts.meetingCode,
    });
  } catch (e) {
    console.warn("[connection respond] email skip:", e);
  }
}

/** PUT: teacher/admin respond, or regenerate Jitsi room (accepted + accepted). */
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
    .select(
      "teacher_id, status, student_id, teacher_response, meeting_code, meeting_link"
    )
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
      {
        error:
          "Y\u00eau c\u1ea7u \u0111\u00e3 t\u1eeb ch\u1ed1i, kh\u00f4ng c\u1eadp nh\u1eadt th\u00eam.",
      },
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

  const { status } = parsed.data;
  const responseTrim = parsed.data.teacher_response?.trim() ?? null;
  const now = new Date().toISOString();

  const prevStatus = row.status as string;
  const patch: Record<string, unknown> = { last_updated: now };

  let emailAction: Parameters<typeof sendConnectionUpdateEmail>[1]["action"] | null =
    null;

  let emailPayload: {
    teacherResponse: string | null;
    meetingLink: string | null;
    meetingCode: string | null;
  } = {
    teacherResponse: null,
    meetingLink: null,
    meetingCode: null,
  };

  if (prevStatus === "pending") {
    if (status === "rejected") {
      patch.status = "rejected";
      patch.teacher_response = responseTrim;
      patch.meeting_code = null;
      patch.meeting_link = null;
      patch.responded_at = now;
      emailAction = "rejected";
      emailPayload.teacherResponse = responseTrim;
    } else if (status === "accepted") {
      patch.status = "accepted";
      const acc = buildAcceptedMeeting(now);
      patch.teacher_response = acc.teacher_response;
      patch.meeting_link = acc.meeting_link;
      patch.meeting_code = acc.meeting_code;
      patch.responded_at = acc.responded_at;
      emailAction = "accepted";
      emailPayload = {
        teacherResponse: null,
        meetingLink: acc.meeting_link,
        meetingCode: null,
      };
    }
  } else if (prevStatus === "accepted") {
    if (status === "rejected") {
      patch.status = "rejected";
      patch.teacher_response = responseTrim;
      patch.meeting_code = null;
      patch.meeting_link = null;
      patch.responded_at = now;
      emailAction = "rejected";
      emailPayload.teacherResponse = responseTrim;
    } else if (status === "accepted") {
      const acc = buildAcceptedMeeting(now);
      patch.teacher_response = acc.teacher_response;
      patch.meeting_link = acc.meeting_link;
      patch.meeting_code = acc.meeting_code;
      patch.responded_at = acc.responded_at;
      emailAction = "link_updated";
      emailPayload = {
        teacherResponse: null,
        meetingLink: acc.meeting_link,
        meetingCode: null,
      };
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
      emailPayload
    );
  }

  return NextResponse.json(data);
}
