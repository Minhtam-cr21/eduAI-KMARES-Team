import {
  assertInstructorOwnsLesson,
  getUserAndProfile,
  isTeacherOrAdmin,
  jsonError,
} from "@/lib/edu-v2/api-helpers";
import { eduContentUpdateSchema } from "@/lib/validations/edu-v2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; contentId: string }> | { id: string; contentId: string } };

export async function PUT(request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const contentId = params.contentId;
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
  const parsed = eduContentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = { ...parsed.data } as Record<string, unknown>;
  if (Object.keys(patch).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const { data: row, error: chk } = await supabase
    .from("edu_lesson_contents")
    .select("id")
    .eq("id", contentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (chk) return jsonError(chk.message, 500);
  if (!row) return jsonError("Not found", 404);

  const { data, error } = await supabase
    .from("edu_lesson_contents")
    .update(patch)
    .eq("id", contentId)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const params = await Promise.resolve(context.params);
  const lessonId = params.id;
  const contentId = params.contentId;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isTeacherOrAdmin(profile)) return jsonError("Forbidden", 403);

  const gate = await assertInstructorOwnsLesson(supabase, lessonId, user.id, profile);
  if (!gate.ok) return gate.response;

  const { error } = await supabase
    .from("edu_lesson_contents")
    .delete()
    .eq("id", contentId)
    .eq("lesson_id", lessonId);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ success: true });
}
