import { courseStructureSchema } from "@/lib/validations/course-structure";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PUT — replace curriculum (chapters + lessons) and benefits for a course.
 * Teacher owns course; lessons are saved as status = published.
 */
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

  const { data: course, error: fetchErr } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (course.teacher_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = courseStructureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const courseId = params.id;
  const { chapters, benefits } = parsed.data;

  if (chapters !== undefined) {
    const payloadLessonIds = new Set<string>();
    const payloadChapterIds = new Set<string>();
    for (const ch of chapters) {
      if (ch.id) payloadChapterIds.add(ch.id);
      for (const le of ch.lessons) {
        if (le.id) payloadLessonIds.add(le.id);
      }
    }

    const { data: existingLessons, error: elErr } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("course_id", courseId);

    if (elErr) {
      return NextResponse.json({ error: elErr.message }, { status: 500 });
    }

    const toDeleteLessonIds = (existingLessons ?? [])
      .map((r) => r.id as string)
      .filter((id) => !payloadLessonIds.has(id));

    if (toDeleteLessonIds.length > 0) {
      const { error: delLErr } = await supabase
        .from("course_lessons")
        .delete()
        .in("id", toDeleteLessonIds);
      if (delLErr) {
        return NextResponse.json({ error: delLErr.message }, { status: 500 });
      }
    }

    const { data: existingChapters, error: ecErr } = await supabase
      .from("course_chapters")
      .select("id")
      .eq("course_id", courseId);

    if (ecErr) {
      return NextResponse.json({ error: ecErr.message }, { status: 500 });
    }

    const toDeleteChapterIds = (existingChapters ?? [])
      .map((r) => r.id as string)
      .filter((id) => !payloadChapterIds.has(id));

    if (toDeleteChapterIds.length > 0) {
      const { error: delOrphanLErr } = await supabase
        .from("course_lessons")
        .delete()
        .in("chapter_id", toDeleteChapterIds);
      if (delOrphanLErr) {
        return NextResponse.json({ error: delOrphanLErr.message }, { status: 500 });
      }
      const { error: delCErr } = await supabase
        .from("course_chapters")
        .delete()
        .in("id", toDeleteChapterIds);
      if (delCErr) {
        return NextResponse.json({ error: delCErr.message }, { status: 500 });
      }
    }

    const chapterIdMap = new Map<string, string>();

    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const desc = ch.description?.trim() || null;
      if (ch.id) {
        const { error: upCErr } = await supabase
          .from("course_chapters")
          .update({
            title: ch.title,
            description: desc,
            order_index: ch.order_index,
          })
          .eq("id", ch.id)
          .eq("course_id", courseId);
        if (upCErr) {
          return NextResponse.json({ error: upCErr.message }, { status: 500 });
        }
        chapterIdMap.set(`idx:${ci}`, ch.id);
      } else {
        const { data: inserted, error: insCErr } = await supabase
          .from("course_chapters")
          .insert({
            course_id: courseId,
            title: ch.title,
            description: desc,
            order_index: ch.order_index,
          })
          .select("id")
          .single();
        if (insCErr || !inserted?.id) {
          return NextResponse.json(
            { error: insCErr?.message ?? "Chapter insert failed" },
            { status: 500 }
          );
        }
        chapterIdMap.set(`idx:${ci}`, inserted.id as string);
      }
    }

    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const resolvedChapterId = chapterIdMap.get(`idx:${ci}`);
      if (!resolvedChapterId) {
        return NextResponse.json({ error: "Chapter mapping failed" }, { status: 500 });
      }

      for (const le of ch.lessons) {
        const content = le.content?.trim() || null;
        const video = le.video_url?.trim() || null;

        const row = {
          course_id: courseId,
          chapter_id: resolvedChapterId,
          title: le.title,
          type: le.type,
          content,
          video_url: video,
          time_estimate: le.time_estimate ?? null,
          order_index: le.order_index,
          status: "published" as const,
        };

        if (le.id) {
          const { error: upLErr } = await supabase
            .from("course_lessons")
            .update(row)
            .eq("id", le.id)
            .eq("course_id", courseId);
          if (upLErr) {
            return NextResponse.json({ error: upLErr.message }, { status: 500 });
          }
        } else {
          const { error: insLErr } = await supabase.from("course_lessons").insert(row);
          if (insLErr) {
            return NextResponse.json({ error: insLErr.message }, { status: 500 });
          }
        }
      }
    }
  }

  if (benefits !== undefined) {
    const payloadBenefitIds = new Set(
      benefits.map((b) => b.id).filter((x): x is string => !!x)
    );

    const { data: existingBenefits, error: ebErr } = await supabase
      .from("course_benefits")
      .select("id")
      .eq("course_id", courseId);

    if (ebErr) {
      return NextResponse.json({ error: ebErr.message }, { status: 500 });
    }

    const toDeleteBenefitIds = (existingBenefits ?? [])
      .map((r) => r.id as string)
      .filter((id) => !payloadBenefitIds.has(id));

    if (toDeleteBenefitIds.length > 0) {
      const { error: delBErr } = await supabase
        .from("course_benefits")
        .delete()
        .in("id", toDeleteBenefitIds);
      if (delBErr) {
        return NextResponse.json({ error: delBErr.message }, { status: 500 });
      }
    }

    for (const b of benefits) {
      const icon = b.icon?.trim() || null;
      const desc = b.description?.trim() || null;
      if (b.id) {
        const { error: upBErr } = await supabase
          .from("course_benefits")
          .update({
            icon,
            title: b.title,
            description: desc,
            display_order: b.display_order,
          })
          .eq("id", b.id)
          .eq("course_id", courseId);
        if (upBErr) {
          return NextResponse.json({ error: upBErr.message }, { status: 500 });
        }
      } else {
        const { error: insBErr } = await supabase.from("course_benefits").insert({
          course_id: courseId,
          icon,
          title: b.title,
          description: desc,
          display_order: b.display_order,
        });
        if (insBErr) {
          return NextResponse.json({ error: insBErr.message }, { status: 500 });
        }
      }
    }
  }

  await supabase
    .from("courses")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", courseId);

  return NextResponse.json({ success: true });
}
