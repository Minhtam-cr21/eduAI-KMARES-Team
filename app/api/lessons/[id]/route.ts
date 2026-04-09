import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/lessons/[id] — bài học đã publish (yêu cầu đăng nhập).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const idParsed = z.string().uuid().safeParse(params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "ID không hợp lệ." }, { status: 400 });
  }
  const id = idParsed.data;

  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select("id, title, content, video_url, topic_id")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (lessonErr) {
    return NextResponse.json({ error: lessonErr.message }, { status: 500 });
  }
  if (!lesson) {
    return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
  }

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("id, title")
    .eq("id", lesson.topic_id)
    .eq("is_published", true)
    .maybeSingle();

  if (topicErr) {
    return NextResponse.json({ error: topicErr.message }, { status: 500 });
  }
  if (!topic) {
    return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
  }

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      video_url: lesson.video_url,
      topic_id: lesson.topic_id,
      topic: { title: topic.title },
    },
  });
}
