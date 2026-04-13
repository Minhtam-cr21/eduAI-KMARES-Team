import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET — các bài học có code_template (published) thuộc khóa học sinh đã đăng ký.
 */
export async function GET() {
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: enroll, error: eErr } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("user_id", user.id);

  if (eErr) {
    return NextResponse.json({ error: eErr.message }, { status: 500 });
  }

  const courseIds = Array.from(
    new Set((enroll ?? []).map((r) => r.course_id as string))
  );

  if (courseIds.length === 0) {
    return NextResponse.json({ lessons: [] });
  }

  const { data: lessons, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, course_id, title, content, code_template, order_index")
    .in("course_id", courseIds)
    .eq("status", "published")
    .not("code_template", "is", null)
    .order("order_index", { ascending: true });

  if (lErr) {
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  const list = lessons ?? [];
  const cids = Array.from(new Set(list.map((l) => l.course_id as string)));
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .in("id", cids);

  const titleByCourse = new Map(
    (courses ?? []).map((c) => [c.id as string, (c.title as string) ?? ""])
  );

  return NextResponse.json({
    lessons: list.map((l) => ({
      id: l.id as string,
      course_id: l.course_id as string,
      course_title: titleByCourse.get(l.course_id as string) ?? "",
      title: l.title as string,
      content: (l.content as string | null) ?? null,
      code_template: (l.code_template as string | null) ?? null,
      order_index: (l.order_index as number | null) ?? 0,
    })),
  });
}
