import {
  assertInstructorOwnsLesson,
  getUserAndProfile,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduLessonUpdateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function lessonVisibleToUser(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  lessonId: string,
  userId: string | undefined,
  profile: { role: string | null } | null
) {
  const { data: les, error: lErr } = await supabase
    .from("edu_lessons")
    .select("id, module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lErr) return { ok: false as const, response: jsonError(lErr.message, 500) };
  if (!les) return { ok: false as const, response: jsonError("Not found", 404) };

  const { data: mod, error: mErr } = await supabase
    .from("edu_modules")
    .select("id, course_id")
    .eq("id", les.module_id as string)
    .maybeSingle();
  if (mErr) return { ok: false as const, response: jsonError(mErr.message, 500) };
  if (!mod) return { ok: false as const, response: jsonError("Not found", 404) };

  const { data: course, error: cErr } = await supabase
    .from("edu_courses")
    .select("id, is_published, is_archived, instructor_id")
    .eq("id", mod.course_id as string)
    .maybeSingle();
  if (cErr) return { ok: false as const, response: jsonError(cErr.message, 500) };
  if (!course) return { ok: false as const, response: jsonError("Not found", 404) };

  const c = course as {
    is_published: boolean;
    is_archived: boolean;
    instructor_id: string;
  };
  const visible = c.is_published && !c.is_archived;
  const owner = userId === c.instructor_id;
  if (!visible && !owner && profile?.role !== "admin") {
    return { ok: false as const, response: jsonError("Not found", 404) };
  }

  return {
    ok: true as const,
    lesson: les,
    courseId: mod.course_id as string,
  };
}

export async function GET(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();

  const gate = await lessonVisibleToUser(supabase, lessonId, user?.id, profile);
  if (!gate.ok) return gate.response;

  const { data: lesson, error } = await supabase
    .from("edu_lessons")
    .select(
      'id, module_id, title, description, "order", lesson_type, duration_minutes, is_locked, created_at, updated_at'
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ lesson, course_id: gate.courseId });
}

export async function PUT(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) return jsonError("Forbidden", 403);

  const gate = await assertInstructorOwnsLesson(supabase, lessonId, user.id, profile);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = eduLessonUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("edu_lessons")
    .update(patch)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) return jsonError("Forbidden", 403);

  const gate = await assertInstructorOwnsLesson(supabase, lessonId, user.id, profile);
  if (!gate.ok) return gate.response;

  const { error } = await supabase.from("edu_lessons").delete().eq("id", lessonId);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ success: true });
}
