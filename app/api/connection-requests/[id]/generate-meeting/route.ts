import { createJitsiMeeting } from "@/lib/meeting/jitsi-room";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST: teacher generates a Jitsi room (not saved until respond PUT). */
export async function POST(
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

  const { data: row, error } = await supabase
    .from("connection_requests")
    .select("teacher_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.teacher_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const st = row.status as string;
  if (st !== "pending" && st !== "accepted") {
    return NextResponse.json(
      {
        error:
          "Ch\u1ec9 t\u1ea1o ph\u00f2ng khi y\u00eau c\u1ea7u \u0111ang ch\u1edd ho\u1eb7c \u0111\u00e3 ch\u1ea5p nh\u1eadn.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(createJitsiMeeting());
}
