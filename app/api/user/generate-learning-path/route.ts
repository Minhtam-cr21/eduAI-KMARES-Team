import { insertMissingLearningPathsForUser } from "@/lib/learning-path-insert";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/user/generate-learning-path — bổ sung learning_paths theo goal (không xóa cũ).
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("goal, hours_per_day")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Không tìm thấy profile." }, { status: 404 });
  }

  const hoursPerDay =
    typeof profile.hours_per_day === "number" && profile.hours_per_day >= 1
      ? profile.hours_per_day
      : 2;

  try {
    const { inserted } = await insertMissingLearningPathsForUser(supabase, {
      userId: user.id,
      profileGoal: profile.goal,
      hoursPerDay: hoursPerDay,
    });

    return NextResponse.json({
      ok: true,
      message:
        inserted > 0
          ? `Đã thêm ${inserted} bài vào lộ trình.`
          : "Không có bài học mới phù hợp để thêm.",
      inserted,
      goal: profile.goal,
      hours_per_day: hoursPerDay,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
