import {
  assertOwnsEduCourse,
  getUserAndProfile,
  isAdmin,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduModuleCreateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();

  const { data: course, error: cErr } = await supabase
    .from("edu_courses")
    .select("id, is_published, is_archived, instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) return jsonError(cErr.message, 500);
  if (!course) return jsonError("Not found", 404);

  const row = course as {
    is_published: boolean;
    is_archived: boolean;
    instructor_id: string;
  };
  const visible = row.is_published && !row.is_archived;
  const owner = user?.id === row.instructor_id;
  if (!visible && !owner && !isAdmin(profile)) {
    return jsonError("Not found", 404);
  }

  const { data: modules, error } = await supabase
    .from("edu_modules")
    .select(
      'id, course_id, title, description, "order", is_locked, duration_hours, created_at, updated_at'
    )
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: modules ?? [] });
}

export async function POST(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const courseId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) return jsonError("Forbidden", 403);

  const gate = await assertOwnsEduCourse(supabase, courseId, user.id, profile);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = eduModuleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("edu_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const nextOrder = parsed.data.order ?? (count ?? 0);

  const ins = {
    course_id: courseId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order: nextOrder,
    is_locked: parsed.data.is_locked ?? false,
    duration_hours: parsed.data.duration_hours ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("edu_modules")
    .insert(ins)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
