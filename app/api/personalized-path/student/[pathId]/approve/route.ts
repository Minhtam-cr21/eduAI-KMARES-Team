import { generateStudySchedule } from "@/lib/schedule/generator";
import { createClient } from "@/lib/supabase/server";
import { ensureEnrollmentAndSyncProgress } from "@/lib/user-courses/enroll-and-sync";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: { pathId: string } };

/** POST — học sinh đồng ý lộ trình → active + sinh study_schedule. */
export async function POST(_request: Request, { params }: Ctx) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pathId = params.pathId;

  const { data: path, error: fetchErr } = await supabase
    .from("personalized_paths")
    .select("id, student_id, status, course_sequence")
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
      { error: "Lộ trình không ở trạng thái chờ xác nhận." },
      { status: 400 }
    );
  }

  const { error: upErr } = await supabase
    .from("personalized_paths")
    .update({
      status: "active",
      student_feedback: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pathId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  try {
    const { inserted } = await generateStudySchedule(supabase, pathId);
    const courseIds = extractCourseIdsFromSequence(path.course_sequence);
    const enrollWarnings: string[] = [];
    for (const courseId of courseIds) {
      const r = await ensureEnrollmentAndSyncProgress(user.id, courseId);
      if (!r.ok) {
        enrollWarnings.push(`${courseId}: ${r.error}`);
      }
    }
    return NextResponse.json({
      ok: true,
      scheduleItems: inserted,
      enrolledCourseIds: courseIds,
      enrollWarnings: enrollWarnings.length ? enrollWarnings : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không tạo được lịch";
    console.error("[student/approve]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function extractCourseIdsFromSequence(sequence: unknown): string[] {
  if (!Array.isArray(sequence)) return [];
  const ids: string[] = [];
  for (const item of sequence) {
    if (item && typeof item === "object" && "course_id" in item) {
      const raw = (item as { course_id: unknown }).course_id;
      if (typeof raw === "string" && raw.length > 0) ids.push(raw);
    }
  }
  return Array.from(new Set(ids));
}
