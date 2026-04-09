import { createClient } from "@/lib/supabase/server";
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
    .select("id, status")
    .eq("id", courseId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course || course.status !== "published") {
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

  const { data: row, error: insErr } = await supabase
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

  return NextResponse.json(row, { status: 201 });
}
