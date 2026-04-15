import { sendConnectionUpdateEmail } from "@/lib/email/send";
import {
  createJitsiMeeting,
  jitsiLinkFromClassCode,
} from "@/lib/meeting/jitsi-room";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const respondSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  teacher_response: z.string().optional().nullable(),
  meeting_code: z.string().max(80).optional().nullable(),
  meeting_link: z.string().url().optional().nullable(),
  generate_meeting: z.boolean().optional(),
});

type ResolvedMeeting = {
  meeting_code: string | null;
  meeting_link: string | null;
  teacher_note: string | null;
};

function resolveAcceptedMeeting(
  p: z.infer<typeof respondSchema>
): ResolvedMeeting | { error: string } {
  const note = p.teacher_response?.trim() || null;

  if (p.generate_meeting) {
    const g = createJitsiMeeting();
    return {
      meeting_code: g.meeting_code,
      meeting_link: g.meeting_link,
      teacher_note: note,
    };
  }

  const rawLink = p.meeting_link?.trim() || null;
  if (rawLink) {
    const code = p.meeting_code?.trim().replace(/\s+/g, "") || null;
    return {
      meeting_code: code,
      meeting_link: rawLink,
      teacher_note: note,
    };
  }

  const rawCode = p.meeting_code?.trim().replace(/\s+/g, "") || null;
  if (rawCode) {
    const link = jitsiLinkFromClassCode(rawCode);
    if (!link) {
      return {
        error:
          "M\u00e3 l\u1edbp kh\u00f4ng h\u1ee3p l\u1ec7 (ch\u1ec9 d\u00f9ng ch\u1eef v\u00e0 s\u1ed1).",
      };
    }
    return {
      meeting_code: rawCode,
      meeting_link: link,
      teacher_note: note,
    };
  }

  if (note) {
    if (/^https?:\/\//i.test(note)) {
      return {
        meeting_code: null,
        meeting_link: note,
        teacher_note: null,
      };
    }
    return {
      meeting_code: null,
      meeting_link: null,
      teacher_note: note,
    };
  }

  return {
    error:
      "Cần tạo phòng Jitsi, nhập link phòng, nhập mã lớp, hoặc ghi chú liên hệ.",
  };
}

function hasStudentFacingContact(m: ResolvedMeeting): boolean {
  return !!(
    m.meeting_link ||
    m.meeting_code ||
    m.teacher_note
  );
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
      (tp?.full_name as string | null)?.trim() || "Giáo viên";

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

/** PUT: teacher/admin respond — pending or update meeting when accepted. */
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
      const resolved = resolveAcceptedMeeting(parsed.data);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      if (!hasStudentFacingContact(resolved)) {
        return NextResponse.json(
          { error: "Thiếu thông tin liên hệ hoặc phòng họp." },
          { status: 400 }
        );
      }
      patch.status = "accepted";
      patch.meeting_code = resolved.meeting_code;
      patch.meeting_link = resolved.meeting_link;
      patch.teacher_response = resolved.teacher_note;
      patch.responded_at = now;
      emailAction = "accepted";
      emailPayload = {
        teacherResponse: resolved.teacher_note,
        meetingLink: resolved.meeting_link,
        meetingCode: resolved.meeting_code,
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
      const resolved = resolveAcceptedMeeting(parsed.data);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      if (!hasStudentFacingContact(resolved)) {
        return NextResponse.json(
          { error: "Thiếu thông tin cập nhật (phòng họp hoặc ghi chú)." },
          { status: 400 }
        );
      }
      patch.meeting_code = resolved.meeting_code;
      patch.meeting_link = resolved.meeting_link;
      patch.teacher_response = resolved.teacher_note;
      emailAction = "link_updated";
      emailPayload = {
        teacherResponse: resolved.teacher_note,
        meetingLink: resolved.meeting_link,
        meetingCode: resolved.meeting_code,
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
