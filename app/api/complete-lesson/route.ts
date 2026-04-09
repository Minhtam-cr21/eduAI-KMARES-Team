import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  lessonId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lessonId } = parsed.data;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("learning_paths")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "completed") {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }
    const { error: upErr } = await supabase
      .from("learning_paths")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (upErr) {
      console.error("[complete-lesson] update:", upErr.message);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error: insErr } = await supabase.from("learning_paths").insert({
    student_id: user.id,
    lesson_id: lessonId,
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  if (insErr) {
    console.error("[complete-lesson] insert:", insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
