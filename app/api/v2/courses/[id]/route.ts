import {
  assertOwnsEduCourse,
  fetchEduCourse,
  getUserAndProfile,
  isAdmin,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduCourseUpdateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function loadStructure(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  courseId: string
) {
  const { data: modules, error: mErr } = await supabase
    .from("edu_modules")
    .select(
      'id, course_id, title, description, "order", is_locked, duration_hours, created_at, updated_at'
    )
    .eq("course_id", courseId)
    .order("order", { ascending: true });
  if (mErr) throw new Error(mErr.message);
  const modList = modules ?? [];
  const modIds = modList.map((m) => m.id as string);
  if (modIds.length === 0) {
    return modList.map((m) => ({ ...m, lessons: [] as unknown[] }));
  }
  const { data: lessons, error: lErr } = await supabase
    .from("edu_lessons")
    .select(
      'id, module_id, title, description, "order", lesson_type, duration_minutes, is_locked, created_at, updated_at'
    )
    .in("module_id", modIds)
    .order("order", { ascending: true });
  if (lErr) throw new Error(lErr.message);
  const lessonRows = lessons ?? [];
  const lessonIds = lessonRows.map((l) => l.id as string);
  let contents: Record<string, unknown[]> = {};
  if (lessonIds.length > 0) {
    const { data: cRows, error: cErr } = await supabase
      .from("edu_lesson_contents")
      .select('id, lesson_id, content_type, "order", content_data, created_at')
      .in("lesson_id", lessonIds)
      .order("order", { ascending: true });
    if (cErr) throw new Error(cErr.message);
    for (const r of cRows ?? []) {
      const lid = r.lesson_id as string;
      contents[lid] = contents[lid] ?? [];
      contents[lid].push(r);
    }
  }
  const lessonsByMod = new Map<string, typeof lessonRows>();
  for (const le of lessonRows) {
    const mid = le.module_id as string;
    const arr = lessonsByMod.get(mid) ?? [];
    arr.push(le);
    lessonsByMod.set(mid, arr);
  }
  return modList.map((m) => {
    const mid = m.id as string;
    const les = (lessonsByMod.get(mid) ?? []).map((le) => ({
      ...le,
      contents: contents[le.id as string] ?? [],
    }));
    return { ...m, lessons: les };
  });
}

export async function GET(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { searchParams } = new URL(request.url);
  const include = searchParams.get("include");

  const { supabase, user, profile } = await getUserAndProfile();
  const { data: course, error } = await fetchEduCourse(supabase, courseId);
  if (error) return jsonError(error.message, 500);
  if (!course) return jsonError("Not found", 404);

  const row = course as { is_published: boolean; is_archived: boolean; instructor_id: string };
  const visible =
    row.is_published && !row.is_archived;
  const owner = user?.id === row.instructor_id;
  if (!visible && !owner && !isAdmin(profile)) {
    return jsonError("Not found", 404);
  }

  if (include === "structure") {
    try {
      const modules = await loadStructure(supabase, courseId);
      return NextResponse.json({ course, modules });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Load failed";
      return jsonError(msg, 500);
    }
  }

  return NextResponse.json({ course });
}

export async function PUT(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  const gate = await assertOwnsEduCourse(supabase, courseId, user.id, profile);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = eduCourseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = { ...parsed.data, updated_at: new Date().toISOString() } as Record<
    string,
    unknown
  >;
  if (parsed.data.is_published === true) {
    patch.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("edu_courses")
    .update(patch)
    .eq("id", courseId)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) return jsonError("Forbidden", 403);
  const gate = await assertOwnsEduCourse(supabase, courseId, user.id, profile);
  if (!gate.ok) return gate.response;

  const { error } = await supabase.from("edu_courses").delete().eq("id", courseId);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ success: true });
}
