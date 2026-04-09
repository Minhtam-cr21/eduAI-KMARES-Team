import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — danh sách đăng ký khóa (admin). */
export async function GET() {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { data: rows, error } = await admin.supabase
    .from("user_courses")
    .select("id, user_id, course_id, status, enrolled_at, completed_at")
    .order("enrolled_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const userIds = Array.from(new Set(list.map((r) => r.user_id as string)));
  const courseIds = Array.from(new Set(list.map((r) => r.course_id as string)));

  const { data: profiles } = await admin.supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("id", userIds);

  const { data: courses } = await admin.supabase
    .from("courses")
    .select("id, title, status")
    .in("id", courseIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { full_name: (p.full_name as string | null) ?? null, role: p.role as string },
    ])
  );
  const courseMap = new Map(
    (courses ?? []).map((c) => [
      c.id as string,
      { title: c.title as string, status: c.status as string },
    ])
  );

  const enriched = list.map((r) => {
    const uid = r.user_id as string;
    const cid = r.course_id as string;
    return {
      ...r,
      student_name: profileMap.get(uid)?.full_name ?? null,
      student_role: profileMap.get(uid)?.role ?? null,
      course_title: courseMap.get(cid)?.title ?? null,
      course_status: courseMap.get(cid)?.status ?? null,
    };
  });

  return NextResponse.json({ rows: enriched });
}
