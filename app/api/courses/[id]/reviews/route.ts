import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).optional().nullable(),
});

/** POST — enrolled student submits one review per course. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  if (profile?.role !== "student") {
    return NextResponse.json(
      { error: "Only students can submit reviews." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const courseId = params.id;

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, is_published")
    .eq("id", courseId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course || course.is_published !== true) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: enroll } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enroll) {
    return NextResponse.json(
      { error: "Enroll in the course before reviewing." },
      { status: 403 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("course_reviews")
    .insert({
      course_id: courseId,
      user_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "You already reviewed this course." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
