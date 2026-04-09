import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { revalidateAdminLessonPaths } from "@/lib/admin/revalidate-lessons";
import { createLessonApiSchema } from "@/lib/validations/lesson";
import { NextResponse } from "next/server";
import { z } from "zod";

function zodMessage(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`)
    .join(" • ");
}

/**
 * GET /api/admin/lessons?topicId=<uuid>
 * Danh sách lesson của topic (admin).
 */
export async function GET(request: Request) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const topicIdRaw = searchParams.get("topicId");
  const topicParsed = z.string().uuid("topicId không hợp lệ").safeParse(topicIdRaw);
  if (!topicParsed.success) {
    return NextResponse.json(
      { error: zodMessage(topicParsed.error) },
      { status: 400 }
    );
  }
  const topicId = topicParsed.data;

  const { data: topic, error: topicErr } = await admin.supabase
    .from("topics")
    .select("id")
    .eq("id", topicId)
    .maybeSingle();

  if (topicErr) {
    return NextResponse.json({ error: topicErr.message }, { status: 500 });
  }
  if (!topic) {
    return NextResponse.json({ error: "Không tìm thấy chủ đề." }, { status: 404 });
  }

  const { data: lessons, error } = await admin.supabase
    .from("lessons")
    .select(
      "id, topic_id, title, content, video_url, order_index, is_published, goals, created_at"
    )
    .eq("topic_id", topicId)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lessons: lessons ?? [] });
}

/**
 * POST /api/admin/lessons
 * Body: createLessonApiSchema (topic_id + các trường form).
 */
export async function POST(request: Request) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON." }, { status: 400 });
  }

  const parsed = createLessonApiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;

  const { data: topic, error: topicErr } = await admin.supabase
    .from("topics")
    .select("id")
    .eq("id", body.topic_id)
    .maybeSingle();

  if (topicErr) {
    return NextResponse.json({ error: topicErr.message }, { status: 500 });
  }
  if (!topic) {
    return NextResponse.json({ error: "Không tìm thấy chủ đề." }, { status: 404 });
  }

  const insert = {
    topic_id: body.topic_id,
    title: body.title.trim(),
    content: body.content.trim() || null,
    video_url: body.video_url?.trim() || null,
    order_index: body.order_index,
    is_published: body.is_published,
    goals: body.goals?.length ? body.goals : [],
  };

  const { data: lesson, error } = await admin.supabase
    .from("lessons")
    .insert(insert)
    .select(
      "id, topic_id, title, content, video_url, order_index, is_published, goals, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAdminLessonPaths(body.topic_id);
  return NextResponse.json({ lesson });
}
