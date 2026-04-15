import { getUserAndProfile, jsonError } from "@/lib/edu-v2/api-helpers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Current user's edu_enrollments course IDs (authenticated). */
export async function GET() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("edu_enrollments")
    .select("course_id, enrolled_at")
    .eq("student_id", user.id);

  if (error) return jsonError(error.message, 500);
  const courseIds = (data ?? []).map((r) => r.course_id as string);
  return NextResponse.json({ courseIds, rows: data ?? [] });
}
