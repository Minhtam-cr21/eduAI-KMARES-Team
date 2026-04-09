import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const language = req.nextUrl.searchParams.get("language") ?? "python";

  const { count, error: countErr } = await supabase
    .from("practice_questions")
    .select("id", { count: "exact", head: true })
    .eq("language", language)
    .eq("is_published", true);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const total = count ?? 0;
  if (total === 0) {
    return NextResponse.json(
      { error: `Chưa có câu hỏi cho ngôn ngữ "${language}".` },
      { status: 404 }
    );
  }

  const offset = Math.floor(Math.random() * total);

  const { data, error } = await supabase
    .from("practice_questions")
    .select("*")
    .eq("language", language)
    .eq("is_published", true)
    .range(offset, offset)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
