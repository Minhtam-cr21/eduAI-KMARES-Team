import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseSequenceRow = {
  course_id: string;
  order_index: number;
  due_date_offset_days: number;
};

function parseCourseSequence(raw: unknown): CourseSequenceRow[] {
  if (!Array.isArray(raw)) return [];
  const out: CourseSequenceRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const course_id = typeof o.course_id === "string" ? o.course_id : "";
    const order_index =
      typeof o.order_index === "number" ? o.order_index : Number(o.order_index);
    const due_date_offset_days =
      typeof o.due_date_offset_days === "number"
        ? o.due_date_offset_days
        : Number(o.due_date_offset_days);
    if (!course_id || !Number.isFinite(order_index)) continue;
    const days = Number.isFinite(due_date_offset_days) ? due_date_offset_days : 7;
    out.push({ course_id, order_index, due_date_offset_days: Math.max(1, days) });
  }
  out.sort((a, b) => a.order_index - b.order_index);
  return out;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Tạo study_schedule từ personalized_paths.course_sequence (đã duyệt).
 * Xóa các dòng lịch cũ cùng path_id (học sinh gọi — RLS DELETE).
 */
export async function generateStudySchedule(
  supabase: SupabaseClient,
  pathId: string
): Promise<{ inserted: number }> {
  const { data: path, error: pathErr } = await supabase
    .from("personalized_paths")
    .select("id, student_id, course_sequence")
    .eq("id", pathId)
    .maybeSingle();

  if (pathErr) throw new Error(pathErr.message);
  if (!path?.student_id) throw new Error("Không tìm thấy lộ trình.");

  const sequence = parseCourseSequence(path.course_sequence);
  if (sequence.length === 0) {
    throw new Error("course_sequence trống.");
  }

  const { error: delErr } = await supabase
    .from("study_schedule")
    .delete()
    .eq("path_id", pathId)
    .eq("user_id", path.student_id);

  if (delErr) throw new Error(delErr.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("hours_per_day")
    .eq("id", path.student_id)
    .maybeSingle();

  const hours =
    typeof profile?.hours_per_day === "number" && profile.hours_per_day >= 1
      ? Math.min(8, profile.hours_per_day)
      : 2;

  /** Số bài tối đa gán trong một ngày theo giờ học (ước lượng). */
  const maxLessonsPerDay = Math.max(1, Math.min(4, Math.round(hours / 2)));

  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);

  let prevOffset = 0;
  const rows: {
    user_id: string;
    path_id: string;
    lesson_id: string;
    due_date: string;
    status: string;
    miss_count: number;
  }[] = [];

  for (const block of sequence) {
    const endOffset = block.due_date_offset_days;
    const span = Math.max(1, endOffset - prevOffset);

    const { data: lessons, error: lesErr } = await supabase
      .from("course_lessons")
      .select("id, order_index")
      .eq("course_id", block.course_id)
      .eq("status", "published")
      .order("order_index", { ascending: true });

    if (lesErr) throw new Error(lesErr.message);
    const list = lessons ?? [];
    if (list.length === 0) {
      prevOffset = endOffset;
      continue;
    }

    const n = list.length;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      const dayInBlock = Math.max(0, Math.ceil(t * span) - 1);
      const dayFromStart = prevOffset + dayInBlock;
      const slot = Math.floor(i / maxLessonsPerDay);
      const dueDay = dayFromStart + slot;
      rows.push({
        user_id: path.student_id,
        path_id: pathId,
        lesson_id: list[i].id as string,
        due_date: addDays(base, dueDay),
        status: "pending",
        miss_count: 0,
      });
    }

    prevOffset = endOffset;
  }

  if (rows.length === 0) {
    throw new Error("Không có bài học published trong các khóa của lộ trình.");
  }

  const { error: insErr } = await supabase.from("study_schedule").insert(rows);
  if (insErr) throw new Error(insErr.message);

  return { inserted: rows.length };
}
