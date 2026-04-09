import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — kiểm tra được phép làm lại MBTI (tối thiểu 2 tháng). */
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
    .select("mbti_last_test")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile?.mbti_last_test) {
    return NextResponse.json({ can_retest: true, last_test: null });
  }

  const lastTest = new Date(profile.mbti_last_test as string);
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - lastTest.getFullYear()) * 12 +
    now.getMonth() -
    lastTest.getMonth();
  const can_retest = monthsDiff >= 2;

  return NextResponse.json({
    can_retest,
    last_test: profile.mbti_last_test,
  });
}
