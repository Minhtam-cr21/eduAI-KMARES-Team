import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  code_template: z.string().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
});

async function getLessonWithCourse(
  supabase: ReturnType<typeof createClient>,
  lessonId: string
) {
  const { data: lesson, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, status, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lErr) return { error: lErr.message as string };
  if (!lesson?.course_id) return { notFound: true as const };

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (cErr) return { error: cErr.message as string };

  return {
    lesson: {
      id: lesson.id as string,
      status: lesson.status as string,
      course_id: lesson.course_id as string,
      teacher_id: course?.teacher_id ?? null,
    },
  };
}

/** PUT — chỉ sửa khi bài chưa published (pending hoặc rejected). */
export async function PUT(
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

  const resolved = await getLessonWithCourse(supabase, params.id);
  if ("error" in resolved && resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 500 });
  }
  if ("notFound" in resolved && resolved.notFound) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { lesson } = resolved as {
    lesson: {
      id: string;
      status: string;
      course_id: string;
      teacher_id: string | null;
    };
  };

  if (lesson.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit lessons in your own courses" },
      { status: 403 }
    );
  }

  if (lesson.status === "published") {
    return NextResponse.json(
      {
        error:
          "Published lessons cannot be edited; create a new lesson or contact admin.",
      },
      { status: 403 }
    );
  }

  if (lesson.status !== "pending" && lesson.status !== "rejected") {
    return NextResponse.json(
      { error: "Only pending or rejected lessons can be edited" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = { ...parsed.data, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("course_lessons")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** DELETE — giáo viên xóa bài trong khóa của mình. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await getLessonWithCourse(supabase, params.id);
  if ("error" in resolved && resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 500 });
  }
  if ("notFound" in resolved && resolved.notFound) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { lesson } = resolved as {
    lesson: { teacher_id: string | null };
  };

  if (lesson.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete lessons in your own courses" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("course_lessons")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
