import { getNextPracticeSuggestion } from "@/lib/practice/next-suggestion";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — gợi ý ngôn ngữ / độ khó / lý do từ lịch sử + OpenAI (fallback rule-based). */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suggestion = await getNextPracticeSuggestion(supabase, user.id);
    return NextResponse.json(suggestion);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
