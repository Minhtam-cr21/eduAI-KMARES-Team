import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .select(
      "id, lesson_id, title, description, hint_logic, code_hint, initial_code, language, sample_input, sample_output, order_index, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[exercises GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json({ exercise });
}
