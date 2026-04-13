import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  teacher_id: z.string().uuid(),
  goal: z.string().min(1, "Mục tiêu là bắt buộc"),
  /** Form mới: bắt buộc từ UI; client cũ không gửi → dùng lại `goal`. */
  reason: z.string().optional().nullable(),
  desired_roadmap: z.string().optional().nullable(),
  available_time: z.string().optional().nullable(),
});

/** POST — học sinh gửi yêu cầu kết nối giáo viên. */
export async function POST(request: Request) {
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
      { error: "Only students can send requests" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { teacher_id, goal, reason, desired_roadmap, available_time } =
    parsed.data;
  const reasonText = (reason?.trim() || goal.trim()).slice(0, 8000);

  const { data: teacher } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", teacher_id)
    .maybeSingle();

  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json(
      { error: "Invalid teacher_id" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("connection_requests")
    .insert({
      student_id: user.id,
      teacher_id,
      goal,
      reason: reasonText,
      desired_roadmap: desired_roadmap?.trim() || null,
      available_time: available_time ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
