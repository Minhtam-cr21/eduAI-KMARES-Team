import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/exercises?lessonId=<uuid> — danh sách exercise của lesson (đã đăng nhập).
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lessonIdRaw = searchParams.get("lessonId");
  const lessonParsed = z.string().uuid().safeParse(lessonIdRaw);
  if (!lessonParsed.success) {
    return NextResponse.json({ error: "Thiếu hoặc sai lessonId." }, { status: 400 });
  }
  const lessonId = lessonParsed.data;

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select(
      "id, lesson_id, title, order_index, language, description, hint_logic, code_hint, initial_code, sample_input, sample_output, created_at"
    )
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exercises: exercises ?? [] });
}
