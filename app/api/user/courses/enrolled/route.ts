import { createClient } from "@/lib/supabase/server";
import { loadStudentEnrolledCourses } from "@/lib/user-courses/enrolled";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — danh sách khóa học đã đăng ký + tiến độ. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loaded = await loadStudentEnrolledCourses(supabase, user.id);
  if (loaded.error || !loaded.data) {
    return NextResponse.json(
      { error: loaded.error ?? "Không tải được danh sách khóa học." },
      { status: loaded.status }
    );
  }

  return NextResponse.json(loaded.data);
}
