import { generateCourseOutlineFromText } from "@/lib/ai/generate-course-outline";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  topic: z.string().min(1).max(2000),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(8000).optional().nullable(),
  /** Base64 (no data: prefix required; optional filename for logging only) */
  file_base64: z.string().optional().nullable(),
  file_name: z.string().max(255).optional().nullable(),
});

/** POST — teacher only: AI generates course + lessons from topic and/or PDF text. */
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

  const { topic, title, description, file_base64, file_name } = parsed.data;

  let sourceText = "";
  if (file_base64?.trim()) {
    let buf: Buffer;
    try {
      buf = Buffer.from(file_base64, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 file" }, { status: 400 });
    }
    if (buf.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
    }
    const lower = (file_name ?? "").toLowerCase();
    if (lower.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const pdfData = await parser.getText();
      sourceText = (pdfData.text ?? "").trim();
    } else {
      sourceText = buf.toString("utf8").slice(0, 500_000);
    }
  }

  if (!sourceText.trim()) {
    sourceText = topic;
  }

  let outline;
  try {
    outline = await generateCourseOutlineFromText({
      topic,
      title: title ?? undefined,
      description: description ?? undefined,
      sourceText,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const courseTitle = title?.trim() || outline.course_title;
  const courseDesc = description?.trim() || outline.course_description;

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .insert({
      title: courseTitle,
      description: courseDesc,
      content: outline.course_description,
      course_type: "skill",
      category: topic.slice(0, 80),
      teacher_id: user.id,
      status: "published",
      is_published: true,
      thumbnail_url: null,
      ai_generated: true,
      source_file: file_name?.trim() || null,
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
  const lessonsPayload = outline.lessons.map((l, i) => ({
    course_id: courseId,
    title: l.title,
    content: l.content,
    video_url: l.video_url ?? null,
    code_template: null as string | null,
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

  return NextResponse.json({
    course_id: courseId,
    course,
    lessons: lessons ?? [],
  });
}
