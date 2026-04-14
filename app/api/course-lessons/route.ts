import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createLessonSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  code_template: z.string().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
});

/** POST — teacher adds a lesson to their own course (lesson saved as published). */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { course_id, title, content, video_url, code_template, order_index } =
    parsed.data;

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("teacher_id, status, is_published")
    .eq("id", course_id)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course || course.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only add lessons to your own courses" },
      { status: 403 }
    );
  }
  const c = course as { is_published?: boolean | null; status?: string };
  if (c.is_published === false) {
    return NextResponse.json(
      { error: "Course is unpublished — publish the course first or enable visibility." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("course_lessons")
    .insert({
      course_id,
      title,
      content: content ?? null,
      video_url: video_url ?? null,
      code_template: code_template ?? null,
      order_index: order_index ?? 0,
      status: "published",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
