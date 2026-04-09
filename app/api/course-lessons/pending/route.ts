import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — admin: bài học course_lessons chờ duyệt. */
export async function GET() {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { data, error } = await admin.supabase
    .from("course_lessons")
    .select("*, courses(id, title, teacher_id, status)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row: Record<string, unknown>) => {
    const { courses: crs, ...rest } = row;
    return { ...rest, course: crs ?? null };
  });

  return NextResponse.json(rows);
}
