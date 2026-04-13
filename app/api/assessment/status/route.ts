import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET — trạng thái hoàn thành bài trắc nghiệm định hướng. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("assessment_completed, assessment_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    completed: profile?.assessment_completed === true,
    completedAt: (profile?.assessment_completed_at as string | null) ?? null,
  });
}
