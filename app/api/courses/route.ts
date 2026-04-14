import { courseSchema } from "@/lib/validations/course";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST — tạo khóa học (chỉ giáo viên). */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher") {
    return NextResponse.json(
      { error: "Only teachers can create courses" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = courseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, course_type, category, thumbnail_url } =
    parsed.data;

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      description: description ?? null,
      course_type,
      category,
      teacher_id: user.id,
      status: "published",
      is_published: true,
      thumbnail_url: thumbnail_url ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

/** GET — danh sách khóa published (phân trang + lọc). */
export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
  const categorySlug =
    searchParams.get("category_slug") ?? searchParams.get("category");
  const course_type = searchParams.get("course_type");

  let query = supabase
    .from("courses")
    .select(
      "*, profiles(id, full_name, avatar_url), course_categories(id, name, slug, icon)",
      { count: "exact" }
    )
    .eq("is_published", true);

  if (categorySlug && categorySlug !== "all") {
    const { data: catRow } = await supabase
      .from("course_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (catRow?.id) {
      query = query.eq("category_id", catRow.id);
    } else {
      query = query.eq("category", categorySlug);
    }
  }
  if (course_type) query = query.eq("course_type", course_type);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row: Record<string, unknown>) => {
    const { profiles: prof, course_categories: categoryRow, ...rest } = row;
    return {
      ...rest,
      teacher: prof ?? null,
      category: categoryRow ?? null,
    };
  });

  return NextResponse.json({
    data: rows,
    count,
    page,
    limit,
  });
}
