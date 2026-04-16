import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { insertTeacherReviewEvent } from "@/lib/teacher/review-store";
import { schemaSyncErrorResponse } from "@/lib/supabase/schema-sync";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { pathId: string } };

/** PUT — gửi lộ trình cho học sinh xác nhận. */
export async function PUT(_request: Request, { params }: Ctx) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;
  const pathId = params.pathId;

  const { data: path, error: fetchErr } = await supabase
    .from("personalized_paths")
    .select("id, teacher_id, student_id, status, course_sequence")
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: upErr } = await supabase
    .from("personalized_paths")
    .update({
      status: "pending_student_approval",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pathId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const reviewInsert = await insertTeacherReviewEvent(supabase, {
    teacher_id: userId,
    student_id: path.student_id as string,
    path_id: pathId,
    review_kind: "personalized_path",
    review_status: "sent_to_student",
    source: "teacher_workflow",
    review_note: "Teacher re-sent the current personalized path for student approval.",
    snapshot: {
      reasoning: "Teacher re-sent the current personalized path for student approval.",
      suggestion_source: null,
      learner_signals_used: [],
      path_status: "pending_student_approval",
      sequence_length: Array.isArray(path.course_sequence)
        ? path.course_sequence.length
        : 0,
    },
  });

  if (reviewInsert.error) {
    if (reviewInsert.schemaError) {
      return schemaSyncErrorResponse(reviewInsert.schemaError);
    }
    return NextResponse.json({ error: reviewInsert.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
