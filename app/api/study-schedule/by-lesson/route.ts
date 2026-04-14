import { fetchStudyScheduleByLesson } from "@/lib/study-schedule/by-lesson";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** GET ?lessonId= — schedule ưu tiên pending, sau đó completed. */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = request.nextUrl.searchParams.get("lessonId");
  const parsed = z.string().uuid().safeParse(lessonId);
  if (!parsed.success) {
    return NextResponse.json({ error: "lessonId không hợp lệ." }, { status: 400 });
  }

  const { error, payload } = await fetchStudyScheduleByLesson(
    supabase,
    user.id,
    parsed.data
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(payload);
}
