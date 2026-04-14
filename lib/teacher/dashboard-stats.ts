import type { SupabaseClient } from "@supabase/supabase-js";

export type TeacherDashboardStats = {
  total_courses: number;
  courses_published: number;
  courses_pending: number;
  total_students: number;
  pending_connections: number;
  pending_ai_roadmaps: number;
  weekly_new_students: Array<{ label: string; count: number }>;
  recent_courses: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    created_at: string;
    lesson_count: number;
  }>;
  recent_pending_requests: Array<{
    id: string;
    student_id: string;
    goal: string;
    available_time: string | null;
    status: string;
    created_at: string;
    student: { full_name: string | null; email: string | null } | null;
  }>;
};

export async function loadTeacherDashboardStats(
  supabase: SupabaseClient,
  userId: string
): Promise<TeacherDashboardStats> {
  const [
    coursesCountRes,
    coursesPublishedRes,
    coursesPendingRes,
    rpcRes,
    pendingConnRes,
    pendingAiRes,
    acceptedConnectionsRes,
    recentCoursesRes,
    pendingListRes,
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", userId),
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", userId)
      .eq("is_published", true),
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", userId)
      .eq("is_published", false),
    supabase.rpc("teacher_list_students_with_stats"),
    supabase
      .from("connection_requests")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", userId)
      .eq("status", "pending"),
    supabase
      .from("custom_roadmaps")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("connection_requests")
      .select("student_id, responded_at")
      .eq("teacher_id", userId)
      .eq("status", "accepted")
      .not("responded_at", "is", null),
    supabase
      .from("courses")
      .select("id, title, status, category, created_at")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("connection_requests")
      .select("id, student_id, goal, available_time, status, created_at")
      .eq("teacher_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const total_courses = coursesCountRes.count ?? 0;
  const courses_published = coursesPublishedRes.count ?? 0;
  const courses_pending = coursesPendingRes.count ?? 0;
  const total_students =
    !rpcRes.error && Array.isArray(rpcRes.data) ? rpcRes.data.length : 0;
  const pending_connections = pendingConnRes.count ?? 0;
  const pending_ai_roadmaps = pendingAiRes.count ?? 0;

  function startOfWeekMonday(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x;
  }

  function weekKeyUtc(d: Date): string {
    return startOfWeekMonday(d).toISOString().slice(0, 10);
  }

  const now = new Date();
  const anchorMonday = startOfWeekMonday(now);
  const weekBuckets: { key: string; label: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const monday = new Date(anchorMonday);
    monday.setDate(anchorMonday.getDate() - w * 7);
    const key = monday.toISOString().slice(0, 10);
    const label = `${monday.getDate()}/${monday.getMonth() + 1}`;
    weekBuckets.push({ key, label, count: 0 });
  }

  const bucketByKey = new Map(weekBuckets.map((b) => [b.key, b]));
  const acceptedRows = acceptedConnectionsRes.data ?? [];
  for (const row of acceptedRows) {
    const raw = (row as { responded_at: string | null }).responded_at;
    if (!raw) continue;
    const k = weekKeyUtc(new Date(raw));
    const b = bucketByKey.get(k);
    if (b) b.count += 1;
  }

  const weekly_new_students = weekBuckets.map(({ label, count }) => ({
    label,
    count,
  }));

  const recentRows = recentCoursesRes.data ?? [];
  const courseIds = recentRows.map((r) => r.id);
  let lessonCountMap = new Map<string, number>();
  if (courseIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from("course_lessons")
      .select("course_id")
      .in("course_id", courseIds);
    for (const row of lessonRows ?? []) {
      const cid = row.course_id as string;
      lessonCountMap.set(cid, (lessonCountMap.get(cid) ?? 0) + 1);
    }
  }

  const recent_courses = recentRows.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    category: c.category,
    created_at: c.created_at,
    lesson_count: lessonCountMap.get(c.id) ?? 0,
  }));

  const rawReq = pendingListRes.data ?? [];
  const studentIds = Array.from(
    new Set(rawReq.map((r) => (r as { student_id: string }).student_id))
  );
  let profileMap = new Map<
    string,
    { full_name: string | null; email: string | null }
  >();
  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    for (const p of profs ?? []) {
      profileMap.set(p.id as string, {
        full_name: p.full_name as string | null,
        email: null,
      });
    }
  }

  const recent_pending_requests = rawReq.map((r) => {
    const row = r as {
      id: string;
      student_id: string;
      goal: string;
      available_time: string | null;
      status: string;
      created_at: string;
    };
    const pr = profileMap.get(row.student_id);
    return {
      id: row.id,
      student_id: row.student_id,
      goal: row.goal,
      available_time: row.available_time,
      status: row.status,
      created_at: row.created_at,
      student: pr ? { full_name: pr.full_name, email: pr.email } : null,
    };
  });

  return {
    total_courses,
    courses_published,
    courses_pending,
    total_students,
    pending_connections,
    pending_ai_roadmaps,
    weekly_new_students,
    recent_courses,
    recent_pending_requests,
  };
}
