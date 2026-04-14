import { courseSchema } from "@/lib/validations/course";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const lessonRowSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(500_000),
  video_url: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const s = String(val).trim();
    return s || null;
  }, z.string().max(2000).nullable()),
  code_template: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const s = String(val);
    return s || null;
  }, z.string().max(200_000).nullable()),
});

const bodySchema = z.object({
  courseData: courseSchema.extend({
    content: z.string().max(200_000).optional().nullable(),
  }),
  lessonsData: z.array(lessonRowSchema).min(1).max(40),
  source_file: z.string().max(255).optional().nullable(),
});

/** POST — giáo viên lưu khóa + bài học sau khi xem trước chỉnh sửa (xuất bản ngay). */
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

  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { courseData, lessonsData, source_file } = parsed.data;
  const content =
    courseData.content?.trim() ||
    courseData.description?.trim() ||
    "";

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .insert({
      title: courseData.title,
      description: courseData.description ?? null,
      content,
      course_type: courseData.course_type,
      category: courseData.category,
      teacher_id: user.id,
      status: "published",
      is_published: true,
      thumbnail_url: courseData.thumbnail_url ?? null,
      ai_generated: true,
      source_file: source_file?.trim() || null,
    })
    .select()
    .single();

  if (cErr || !course) {
    return NextResponse.json(
      { error: cErr?.message ?? "Insert course failed" },
      { status: 500 }
    );
  }

  const courseId = course.id as string;
  const lessonsPayload = lessonsData.map((l, i) => ({
    course_id: courseId,
    title: l.title,
    content: l.content,
    video_url: l.video_url ?? null,
    code_template: l.code_template ?? null,
    order_index: i,
    status: "published" as const,
    created_by: user.id,
  }));

  const { data: lessons, error: lErr } = await supabase
    .from("course_lessons")
    .insert(lessonsPayload)
    .select("id, title, order_index");

  if (lErr) {
    await supabase.from("courses").delete().eq("id", courseId);
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      course_id: courseId,
      lesson_ids: (lessons ?? []).map((r) => r.id as string),
      course,
      lessons: lessons ?? [],
    },
    { status: 201 }
  );
}
