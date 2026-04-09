import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  course_type: z.enum(["skill", "role"]).optional(),
  category: z.string().min(1).optional(),
  thumbnail_url: z.string().nullable().optional(),
});

/** PUT — giáo viên cập nhật khóa học của mình (không đổi teacher_id / status qua route này). */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: course, error: fetchErr } = await supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (course.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own courses" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = { ...parsed.data, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("courses")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** DELETE — giáo viên xóa khóa học (không có bài course_lessons đã published). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: course, error: fetchErr } = await supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (course.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete your own courses" },
      { status: 403 }
    );
  }

  const { count, error: cntErr } = await supabase
    .from("course_lessons")
    .select("*", { count: "exact", head: true })
    .eq("course_id", params.id)
    .eq("status", "published");

  if (cntErr) {
    return NextResponse.json({ error: cntErr.message }, { status: 500 });
  }
  if (count && count > 0) {
    return NextResponse.json(
      { error: "Cannot delete course with published lessons" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("courses").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
