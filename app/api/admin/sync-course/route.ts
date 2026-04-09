import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { syncCourseProgress } from "@/lib/user-courses/sync-course-progress";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.union([
  z.object({ userCourseId: z.string().uuid() }),
  z.object({
    userId: z.string().uuid(),
    courseId: z.string().uuid(),
  }),
]);

/**
 * POST — đồng bộ user_course_progress theo các bài published của khóa.
 * Xóa progress cũ (user + course), tạo lại từng bài pending.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const supabase = admin.supabase;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let userId: string;
  let courseId: string;
  let userCourseId: string | null = null;

  if ("userCourseId" in parsed.data) {
    userCourseId = parsed.data.userCourseId;
    const { data: uc, error: ucErr } = await supabase
      .from("user_courses")
      .select("id, user_id, course_id")
      .eq("id", userCourseId)
      .maybeSingle();

    if (ucErr) {
      return NextResponse.json({ error: ucErr.message }, { status: 500 });
    }
    if (!uc) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi đăng ký." }, { status: 404 });
    }
    userId = uc.user_id as string;
    courseId = uc.course_id as string;
  } else {
    userId = parsed.data.userId;
    courseId = parsed.data.courseId;
    const { data: uc } = await supabase
      .from("user_courses")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    userCourseId = uc?.id as string | undefined ?? null;
    if (!userCourseId) {
      return NextResponse.json(
        { error: "Không có đăng ký khóa cho cặp user/course này." },
        { status: 404 }
      );
    }
  }

  const result = await syncCourseProgress(supabase, userId, courseId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    created: result.created,
    user_course_id: userCourseId,
    message:
      result.created === 0
        ? "Khóa không có bài học đã xuất bản."
        : undefined,
  });
}
