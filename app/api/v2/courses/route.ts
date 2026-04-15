import {
  getUserAndProfile,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduCourseCreateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — published catalog; ?mine=1 for teacher's drafts (auth). POST — create course (teacher/admin). */
export async function GET(request: NextRequest) {
  const { supabase, user, profile } = await getUserAndProfile();
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const qText = searchParams.get("q")?.trim();
  const categoryText = searchParams.get("category")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase
    .from("edu_courses")
    .select(
      "id, title, description, language, level, category, thumbnail_url, instructor_id, duration_hours, total_lessons, is_published, is_archived, created_at, updated_at, published_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (qText) {
    const esc = qText.replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`title.ilike.%${esc}%,description.ilike.%${esc}%`);
  }
  if (categoryText) {
    q = q.ilike("category", `%${categoryText.replace(/%/g, "\\%")}%`);
  }

  if (mine && user && isTeacherOrAdmin(profile)) {
    if (profile?.role === "admin") {
      /* all */
    } else {
      q = q.eq("instructor_id", user.id);
    }
  } else {
    q = q.eq("is_published", true).eq("is_archived", false);
  }

  const { data, error, count } = await q;
  if (error) {
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) {
    return jsonError("Forbidden", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = eduCourseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ins = {
    ...parsed.data,
    instructor_id: user.id,
    is_published: parsed.data.is_published ?? false,
    is_archived: parsed.data.is_archived ?? false,
    language: parsed.data.language ?? "vi",
    level: parsed.data.level ?? "beginner",
  };

  const { data, error } = await supabase
    .from("edu_courses")
    .insert(ins)
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }
  return NextResponse.json(data, { status: 201 });
}
