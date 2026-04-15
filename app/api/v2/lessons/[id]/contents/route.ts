import {
  assertInstructorOwnsLesson,
  getUserAndProfile,
  isAdmin,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduContentCreateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function canReadLessonContents(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  lessonId: string,
  userId: string | undefined,
  profile: { role: string | null } | null
) {
  const { data: les } = await supabase
    .from("edu_lessons")
    .select("module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!les?.module_id) return false;

  const { data: mod } = await supabase
    .from("edu_modules")
    .select("course_id")
    .eq("id", les.module_id as string)
    .maybeSingle();
  if (!mod?.course_id) return false;

  const { data: course } = await supabase
    .from("edu_courses")
    .select("is_published, is_archived, instructor_id")
    .eq("id", mod.course_id as string)
    .maybeSingle();
  if (!course) return false;

  const c = course as {
    is_published: boolean;
    is_archived: boolean;
    instructor_id: string;
  };
  const visible = c.is_published && !c.is_archived;
  const owner = userId === c.instructor_id;
  return visible || owner || profile?.role === "admin";
}

export async function GET(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const { supabase, user, profile } = await getUserAndProfile();

  const ok = await canReadLessonContents(supabase, lessonId, user?.id, profile);
  if (!ok) return jsonError("Not found", 404);

  const { data, error } = await supabase
    .from("edu_lesson_contents")
    .select('id, lesson_id, content_type, "order", content_data, created_at')
    .eq("lesson_id", lessonId)
    .order("order", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, context: Ctx) {
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
  const parsed = eduContentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("edu_lesson_contents")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  const nextOrder = parsed.data.order ?? (count ?? 0);

  const ins = {
    lesson_id: lessonId,
    content_type: parsed.data.content_type,
    order: nextOrder,
    content_data: parsed.data.content_data ?? {},
  };

  const { data, error } = await supabase
    .from("edu_lesson_contents")
    .insert(ins)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
