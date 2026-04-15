import { courseSchema } from "@/lib/validations/course";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COURSE_LIST_FIELDS =
  "id, title, description, course_type, category, category_id, thumbnail_url, image_url, promo_video_url, is_published, created_at, price, original_price, duration_hours, total_lessons, rating, level, enrolled_count, reviews_count";

function escapeIlikeSearch(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
}

/** POST — create course (teacher only). */
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

  const d = parsed.data;
  let categoryLabel = d.category;
  if (d.category_id) {
    const { data: crow } = await supabase
      .from("course_categories")
      .select("name")
      .eq("id", d.category_id)
      .maybeSingle();
    if (crow?.name) categoryLabel = crow.name as string;
  }

  const insert: Record<string, unknown> = {
    title: d.title,
    description: d.description ?? null,
    content: d.content ?? null,
    course_type: d.course_type,
    category: categoryLabel,
    category_id: d.category_id ?? null,
    teacher_id: user.id,
    status: "published",
    is_published: true,
    thumbnail_url: d.thumbnail_url ?? null,
    image_url: d.image_url ?? null,
    promo_video_url: d.promo_video_url ?? null,
    price: d.price ?? 0,
    duration_hours: d.duration_hours ?? null,
    level: d.level ?? "beginner",
    objectives: d.objectives ?? null,
    target_audience: d.target_audience ?? null,
    recommendations: d.recommendations ?? null,
    what_you_will_learn: d.what_you_will_learn ?? null,
    requirements: d.requirements ?? null,
    faq: d.faq ?? null,
    highlights: d.highlights ?? null,
    outcomes_after: d.outcomes_after ?? null,
  };

  const { data, error } = await supabase
    .from("courses")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

/** GET — danh sách khóa published (phân trang + lọc category + search + sort + enrollment). */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
  const categorySlug =
    searchParams.get("categorySlug") ??
    searchParams.get("category_slug") ??
    searchParams.get("category");
  const course_type = searchParams.get("course_type");
  const search =
    searchParams.get("search") ?? searchParams.get("q") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const enrollment = searchParams.get("enrollment") ?? "all";

  let categoryId: string | null = null;
  if (categorySlug && categorySlug !== "all") {
    const { data: catRow } = await supabase
      .from("course_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (!catRow?.id) {
      return NextResponse.json({ data: [], count: 0, page, limit });
    }
    categoryId = catRow.id;
  }

  let query = supabase
    .from("courses")
    .select(
      `${COURSE_LIST_FIELDS}, profiles(id, full_name, avatar_url), course_categories(id, name, slug, icon)`,
      { count: "exact" }
    )
    .eq("is_published", true);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (course_type) query = query.eq("course_type", course_type);

  const q = search?.trim();
  if (q) {
    const safe = escapeIlikeSearch(q);
    const pattern = `%${safe}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  let enrolledIds: string[] = [];
  if (user && (enrollment === "enrolled" || enrollment === "not_enrolled")) {
    const { data: ucRows } = await supabase
      .from("user_courses")
      .select("course_id")
      .eq("user_id", user.id)
      .neq("status", "dropped");
    enrolledIds = (ucRows ?? []).map((r) => r.course_id as string);
  }

  if (enrollment === "enrolled") {
    if (enrolledIds.length === 0) {
      return NextResponse.json({
        data: [],
        count: 0,
        page,
        limit,
      });
    }
    query = query.in("id", enrolledIds);
  } else if (enrollment === "not_enrolled" && enrolledIds.length > 0) {
    query = query.not("id", "in", `(${enrolledIds.join(",")})`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (sort === "popular") {
    query = query
      .order("enrolled_count", { ascending: false })
      .order("rating", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

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
