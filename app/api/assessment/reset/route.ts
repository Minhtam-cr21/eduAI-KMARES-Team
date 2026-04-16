import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST — xóa kết quả trắc nghiệm để học sinh làm lại.
 * Xóa toàn bộ row `career_orientations`, nên các cột additive Phase 3 như
 * `learner_profile`, `ai_analysis`, `analysis_source`, `assessment_version`
 * cũng được dọn cùng lúc và vẫn giữ compatibility với flow cũ.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("assessment_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.assessment_completed !== true) {
    return NextResponse.json(
      { error: "Chưa có bài test hoàn thành để xóa." },
      { status: 400 }
    );
  }

  const { error: delA } = await supabase
    .from("assessment_responses")
    .delete()
    .eq("user_id", user.id);
  if (delA) {
    return NextResponse.json({ error: delA.message }, { status: 500 });
  }

  const { error: delC } = await supabase
    .from("career_orientations")
    .delete()
    .eq("user_id", user.id);
  if (delC) {
    return NextResponse.json({ error: delC.message }, { status: 500 });
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      assessment_completed: false,
      assessment_completed_at: null,
      career_orientation: null,
      mbti_type: null,
    })
    .eq("id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
