import { buildCourseSequenceFromRoadmap } from "@/lib/ai/convert-roadmap-to-sequence";
import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { generateStudySchedule } from "@/lib/schedule/generator";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureEnrollmentAndSyncProgress } from "@/lib/user-courses/enroll-and-sync";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const WORKFLOW_STATUSES = [
  "draft",
  "pending",
  "pending_student_approval",
  "revision_requested",
] as const;

const bodySchema = z.object({
  teacher_feedback: z.string().max(4000).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> | { id: string } };

function extractCourseIdsFromSequence(
  sequence: { course_id: string; order_index: number; due_date_offset_days: number }[]
): string[] {
  const ids = sequence.map((r) => r.course_id).filter(Boolean);
  return Array.from(new Set(ids));
}

export async function POST(request: Request, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const roadmapId = params.id;

  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase, userId } = gate;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = {};
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const optionalTeacherNote = parsed.data.teacher_feedback?.trim() || null;
  const pathFeedbackText =
    optionalTeacherNote ||
    "Lộ trình được tạo từ AI, bạn có thể điều chỉnh.";

  const { data: roadmap, error: fetchErr } = await supabase
    .from("custom_roadmaps")
    .select(
      "id, user_id, title, modules, total_duration_days, reasoning, status"
    )
    .eq("id", roadmapId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!roadmap) {
    return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
  }
  if (roadmap.status !== "pending") {
    return NextResponse.json(
      { error: "Roadmap is not pending approval" },
      { status: 400 }
    );
  }

  const studentId = roadmap.user_id as string;

  let course_sequence: {
    course_id: string;
    order_index: number;
    due_date_offset_days: number;
  }[];
  try {
    course_sequence = await buildCourseSequenceFromRoadmap({
      title: roadmap.title as string | null,
      modules: roadmap.modules,
      reasoning: roadmap.reasoning as string | null,
      total_duration_days: roadmap.total_duration_days as number | null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không chuyển đổi được lộ trình";
    console.error("[custom-roadmaps/approve] convert", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (course_sequence.length === 0) {
    return NextResponse.json(
      {
        error:
          "Không gợi ý được khóa học phù hợp. Hãy thêm khóa published hoặc chỉnh module trong lộ trình.",
      },
      { status: 400 }
    );
  }

  const { data: existingList } = await supabase
    .from("personalized_paths")
    .select("id, status")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const editableStatuses = new Set<string>(WORKFLOW_STATUSES);
  const editable = existingList?.find((p) => editableStatuses.has(p.status));

  let pathId: string;

  if (!editable) {
    const hasActive = existingList?.some((p) => p.status === "active");
    if (hasActive) {
      return NextResponse.json(
        {
          error:
            "Học sinh đang có lộ trình active. Chờ góp ý hoặc tạm dừng trước khi duyệt lộ trình AI.",
        },
        { status: 409 }
      );
    }

    const { data: inserted, error: insErr } = await supabase
      .from("personalized_paths")
      .insert({
        student_id: studentId,
        teacher_id: userId,
        course_sequence,
        status: "pending_student_approval",
        teacher_feedback: pathFeedbackText,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      return NextResponse.json(
        { error: insErr?.message ?? "Không tạo được personalized_paths" },
        { status: 500 }
      );
    }
    pathId = inserted.id as string;
  } else {
    const { data: updated, error: upErr } = await supabase
      .from("personalized_paths")
      .update({
        course_sequence,
        status: "pending_student_approval",
        teacher_id: userId,
        teacher_feedback: pathFeedbackText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editable.id)
      .select("id")
      .maybeSingle();

    if (upErr || !updated?.id) {
      return NextResponse.json(
        { error: upErr?.message ?? "Không cập nhật được personalized_paths" },
        { status: 500 }
      );
    }
    pathId = updated.id as string;
  }

  const { error: rmErr } = await supabase
    .from("custom_roadmaps")
    .update({
      status: "approved",
      teacher_feedback: optionalTeacherNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roadmapId);

  if (rmErr) {
    return NextResponse.json({ error: rmErr.message }, { status: 500 });
  }

  const courseIds = extractCourseIdsFromSequence(course_sequence);
  const enrollWarnings: string[] = [];
  for (const courseId of courseIds) {
    const r = await ensureEnrollmentAndSyncProgress(studentId, courseId);
    if (!r.ok) {
      enrollWarnings.push(`${courseId}: ${r.error}`);
    }
  }

  let scheduleInserted = 0;
  try {
    const admin = createServiceRoleClient();
    const { inserted } = await generateStudySchedule(admin, pathId);
    scheduleInserted = inserted;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không tạo được lịch học";
    console.error("[custom-roadmaps/approve] schedule", msg);
    return NextResponse.json(
      {
        error: msg,
        pathId,
        enrollWarnings: enrollWarnings.length ? enrollWarnings : undefined,
      },
      { status: 500 }
    );
  }

  try {
    const admin = createServiceRoleClient();
    const { error: nErr } = await admin.from("notifications").insert({
      user_id: studentId,
      type: "roadmap_approved",
      title: "Lộ trình AI đã được giáo viên duyệt",
      content:
        "Lộ trình cá nhân hóa của bạn đã sẵn sàng. Vui lòng vào mục Lộ trình cá nhân hóa để xem và xác nhận.",
      link: "/personalized-roadmap",
    });
    if (nErr) {
      console.error("[custom-roadmaps/approve] notification", nErr.message);
    }
  } catch (e) {
    console.warn(
      "[custom-roadmaps/approve] notification skipped:",
      e instanceof Error ? e.message : e
    );
  }

  return NextResponse.json({
    success: true,
    pathId,
    scheduleItems: scheduleInserted,
    enrollWarnings: enrollWarnings.length ? enrollWarnings : undefined,
  });
}
