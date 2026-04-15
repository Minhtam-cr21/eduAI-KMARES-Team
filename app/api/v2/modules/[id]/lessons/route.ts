import {
  assertInstructorOwnsModule,
  getUserAndProfile,
  isAdmin,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduLessonCreateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const moduleId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();

  const { data: mod, error: mErr } = await supabase
    .from("edu_modules")
    .select("id, course_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (mErr) return jsonError(mErr.message, 500);
  if (!mod) return jsonError("Not found", 404);

  const { data: course, error: cErr } = await supabase
    .from("edu_courses")
    .select("is_published, is_archived, instructor_id")
    .eq("id", mod.course_id as string)
    .maybeSingle();
  if (cErr) return jsonError(cErr.message, 500);
  if (!course) return jsonError("Not found", 404);

  const c = course as {
    is_published: boolean;
    is_archived: boolean;
    instructor_id: string;
  };
  const visible = c.is_published && !c.is_archived;
  const owner = user?.id === c.instructor_id;
  if (!visible && !owner && !isAdmin(profile)) {
    return jsonError("Not found", 404);
  }

  const { data: lessons, error } = await supabase
    .from("edu_lessons")
    .select(
      'id, module_id, title, description, "order", lesson_type, duration_minutes, is_locked, created_at, updated_at'
    )
    .eq("module_id", moduleId)
    .order("order", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: lessons ?? [] });
}

export async function POST(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const moduleId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) return jsonError("Forbidden", 403);

  const gate = await assertInstructorOwnsModule(supabase, moduleId, user.id, profile);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = eduLessonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("edu_lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const nextOrder = parsed.data.order ?? (count ?? 0);

  const ins = {
    module_id: moduleId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order: nextOrder,
    lesson_type: parsed.data.lesson_type ?? "lecture",
    duration_minutes: parsed.data.duration_minutes ?? 0,
    is_locked: parsed.data.is_locked ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("edu_lessons")
    .insert(ins)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
