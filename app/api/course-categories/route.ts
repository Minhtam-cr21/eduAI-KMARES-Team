import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — danh sách danh mục khóa học (đọc công khai). */
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("course_categories")
    .select("id, name, slug, display_order")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
