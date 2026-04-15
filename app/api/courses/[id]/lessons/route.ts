import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LESSON_COLUMNS =
  "id, course_id, chapter_id, title, content, video_url, code_template, order_index, status, type, time_estimate, created_at, updated_at";

/** GET — danh sách bài học đã published của một khóa học (tuỳ chọn ?page=&limit=). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const pageRaw = searchParams.get("page");

  let q = supabase
    .from("course_lessons")
    .select(LESSON_COLUMNS, { count: "exact" })
    .eq("course_id", params.id)
    .eq("status", "published")
    .order("order_index", { ascending: true });

  if (limitRaw !== null) {
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
    const page = Math.max(1, parseInt(pageRaw || "1", 10));
    const from = (page - 1) * limit;
    q = q.range(from, from + limit - 1);
  }

  const { data, error, count } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (limitRaw !== null) {
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
    const page = Math.max(1, parseInt(pageRaw || "1", 10));
    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      page,
      limit,
    });
  }

  return NextResponse.json(data ?? []);
}
