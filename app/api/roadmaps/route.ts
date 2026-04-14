import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — public roadmaps (is_public = true). */
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roadmaps")
    .select("id, title, description, image_url, tags, created_at, teacher_id")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
