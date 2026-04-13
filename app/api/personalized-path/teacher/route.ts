import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const WORKFLOW_STATUSES = [
  "draft",
  "pending",
  "pending_student_approval",
  "revision_requested",
] as const;

const postBodySchema = z.object({
  studentId: z.string().uuid(),
  courseSequence: z.array(
    z.object({
      course_id: z.string().uuid(),
      order_index: z.number().int().min(0),
      due_date_offset_days: z.number().int().min(1).optional(),
      recommended_due_date_offset_days: z.number().int().min(1).optional(),
    })
  ),
  status: z.enum(["draft", "pending_student_approval"]),
});

function normalizeSequence(
  items: z.infer<typeof postBodySchema>["courseSequence"]
) {
  return items
    .map((row, i) => ({
      course_id: row.course_id,
      order_index: row.order_index ?? i,
      due_date_offset_days:
        row.due_date_offset_days ??
        row.recommended_due_date_offset_days ??
        7 * (i + 1),
    }))
    .sort((a, b) => a.order_index - b.order_index);
}

/** GET — danh sách lộ trình cần xử lý (chờ học sinh / chỉnh sửa / nháp). */
export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;

  let q = supabase
    .from("personalized_paths")
    .select("id, student_id, teacher_id, status, updated_at, created_at")
    .in("status", [...WORKFLOW_STATUSES, "active", "paused"]);

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (me?.role !== "admin") {
    q = q.eq("teacher_id", userId);
  }

  const { data, error } = await q.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const paths = data ?? [];
  const studentIds = Array.from(
    new Set(paths.map((p) => p.student_id).filter(Boolean))
  ) as string[];
  const nameById = new Map<string, string | null>();

  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    for (const p of profs ?? []) {
      nameById.set(p.id as string, (p.full_name as string | null) ?? null);
    }
  }

  const rows = paths.map((r) => ({
    id: r.id,
    student_id: r.student_id,
    teacher_id: r.teacher_id,
    status: r.status,
    updated_at: r.updated_at,
    created_at: r.created_at,
    student_name: r.student_id ? nameById.get(r.student_id) ?? null : null,
  }));

  return NextResponse.json({ paths: rows });
}

/** POST — tạo mới hoặc cập nhật lộ trình cho học sinh. */
export async function POST(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const course_sequence = normalizeSequence(parsed.data.courseSequence);
  const { studentId, status } = parsed.data;

  const { data: existingList } = await supabase
    .from("personalized_paths")
    .select("id, status")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const editableStatuses = new Set<string>(WORKFLOW_STATUSES);
  const editable = existingList?.find((p) => editableStatuses.has(p.status));

  if (!editable) {
    const hasActive = existingList?.some((p) => p.status === "active");
    if (hasActive) {
      return NextResponse.json(
        {
          error:
            "Học sinh đang có lộ trình active. Chờ góp ý hoặc tạm dừng trước khi tạo bản mới.",
        },
        { status: 409 }
      );
    }
  }

  if (editable) {
    const { data, error } = await supabase
      .from("personalized_paths")
      .update({
        course_sequence,
        status,
        teacher_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editable.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pathId: data?.id ?? editable.id });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("personalized_paths")
    .insert({
      student_id: studentId,
      teacher_id: userId,
      course_sequence,
      status,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pathId: inserted?.id });
}
