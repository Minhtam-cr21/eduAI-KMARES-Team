import { createClient } from "@/lib/supabase/server";
import { ensureEnrollmentAndSyncProgress } from "@/lib/user-courses/enroll-and-sync";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  courseId: z.string().uuid(),
});

/** POST — đăng ký khóa học (học sinh). */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "student") {
    return NextResponse.json(
      { error: "Chỉ học sinh mới đăng ký được khóa học." },
      { status: 403 }
    );
  }

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

  const { courseId } = parsed.data;

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, status, is_published")
    .eq("id", courseId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  const courseRow = course as {
    id?: string;
    status?: string;
    is_published?: boolean | null;
  } | null;
  const visible =
    courseRow &&
    (courseRow.is_published === true || courseRow.status === "published");
  if (!visible) {
    return NextResponse.json(
      { error: "Khóa học không tồn tại hoặc chưa xuất bản." },
      { status: 404 }
    );
  }

  const { data: existing } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Bạn đã đăng ký khóa học này." },
      { status: 409 }
    );
  }

  const { data: enrollment, error: insErr } = await supabase
    .from("user_courses")
    .insert({
      user_id: user.id,
      course_id: courseId,
      status: "active",
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const sync = await ensureEnrollmentAndSyncProgress(user.id, courseId);
  const syncWarning =
    !sync.ok && sync.error
      ? `Đăng ký OK nhưng chưa đồng bộ lộ trình: ${sync.error}`
      : undefined;

  return NextResponse.json(
    {
      ...enrollment,
      progress_synced: sync.ok,
      sync_created: sync.ok ? sync.created : 0,
      syncWarning,
    },
    { status: 201 }
  );
}
