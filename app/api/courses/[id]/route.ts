import { updateCourseSchema } from "@/lib/validations/course";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function reviewStats(reviews: { rating: number }[]) {
  const by_star = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    const n = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    by_star[n]++;
    sum += r.rating;
  }
  const count = reviews.length;
  const average = count ? Math.round((sum / count) * 100) / 100 : 0;
  return { average, count, by_star };
}

/** GET — chi tiết khóa học công khai (catalog). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select(
      `
      id, title, description, content, course_type, category, category_id,
      thumbnail_url, image_url, promo_video_url, teacher_id,
      price, original_price, duration_hours, total_lessons, rating, level, enrolled_count, reviews_count,
      objectives, target_audience, recommendations, what_you_will_learn, requirements, faq,
      highlights, outcomes_after,
      is_published, created_at, updated_at,
      course_categories ( id, name, slug, icon ),
      profiles!courses_teacher_id_fkey ( id, full_name, avatar_url )
    `
    )
    .eq("id", params.id)
    .eq("is_published", true)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = course as Record<string, unknown>;
  const teacher = row.profiles ?? null;
  const category = row.course_categories ?? null;
  delete row.profiles;
  delete row.course_categories;

  const { data: lessons, error: lErr } = await supabase
    .from("course_lessons")
    .select(
      "id, title, order_index, video_url, status, chapter_id, type, time_estimate, content"
    )
    .eq("course_id", params.id)
    .eq("status", "published")
    .order("order_index", { ascending: true });

  if (lErr) {
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  const { data: benefitRows, error: bErr } = await supabase
    .from("course_benefits")
    .select("id, icon, title, description, display_order")
    .eq("course_id", params.id)
    .order("display_order", { ascending: true });

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  const { data: chapterRows, error: chErr } = await supabase
    .from("course_chapters")
    .select("id, title, description, order_index")
    .eq("course_id", params.id)
    .order("order_index", { ascending: true });

  if (chErr) {
    return NextResponse.json({ error: chErr.message }, { status: 500 });
  }

  const lessonList = lessons ?? [];
  type CurriculumChapterRow = {
    id: string | null;
    title: unknown;
    description: unknown;
    order_index: unknown;
    lessons: typeof lessonList;
  };

  const chapters: CurriculumChapterRow[] = (chapterRows ?? []).map((ch) => {
    const o = ch as Record<string, unknown>;
    const chId = o.id as string;
    return {
      id: chId,
      title: o.title,
      description: o.description,
      order_index: o.order_index,
      lessons: lessonList.filter((l) => (l as { chapter_id?: string }).chapter_id === chId),
    };
  });

  const orphanLessons = lessonList.filter(
    (l) => !(l as { chapter_id?: string | null }).chapter_id
  );
  const orphanChapter: CurriculumChapterRow = {
    id: null,
    title: "Nội dung khóa học",
    description: null,
    order_index: 9999,
    lessons: orphanLessons,
  };
  let curriculum_chapters: CurriculumChapterRow[] =
    chapters.length === 0 && orphanLessons.length > 0
      ? [orphanChapter]
      : chapters.length > 0
        ? [...chapters]
        : [];
  if (chapters.length > 0 && orphanLessons.length > 0) {
    curriculum_chapters = [...curriculum_chapters, orphanChapter];
  }

  const { data: reviewRows, error: rErr } = await supabase
    .from("course_reviews")
    .select(
      `
      id, rating, comment, created_at, user_id,
      profiles!course_reviews_user_id_fkey ( full_name, avatar_url )
    `
    )
    .eq("course_id", params.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  const rawReviews = reviewRows ?? [];
  const reviews = rawReviews.map((r) => {
    const o = r as Record<string, unknown>;
    const prof = o.profiles as { full_name: string | null; avatar_url: string | null } | null;
    return {
      id: o.id,
      rating: o.rating,
      comment: o.comment,
      created_at: o.created_at,
      user_id: o.user_id,
      user: prof
        ? { full_name: prof.full_name, avatar_url: prof.avatar_url }
        : null,
    };
  });

  let my_review: (typeof reviews)[0] | null = null;
  if (user) {
    my_review = reviews.find((r) => r.user_id === user.id) ?? null;
  }

  const stats = reviewStats(
    rawReviews.map((r) => ({ rating: r.rating as number }))
  );

  return NextResponse.json({
    course: { ...row, teacher, category },
    lessons: lessonList,
    chapters: curriculum_chapters,
    benefits: benefitRows ?? [],
    reviews,
    review_stats: stats,
    my_review,
  });
}

/** PUT — teacher updates own course. */
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
    .select("teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (course.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own courses" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) patch[k] = v;
  }

  if (parsed.data.category_id) {
    const { data: crow } = await supabase
      .from("course_categories")
      .select("name")
      .eq("id", parsed.data.category_id)
      .maybeSingle();
    if (crow?.name) patch.category = crow.name;
  }

  patch.updated_at = new Date().toISOString();
  if (typeof parsed.data.is_published === "boolean") {
    patch.status = parsed.data.is_published ? "published" : "pending";
  }

  const { data, error } = await supabase
    .from("courses")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** DELETE — teacher deletes course (no published lessons, etc.). */
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

  const { data: course, error: fetchErr } = await supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (course.teacher_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete your own courses" },
      { status: 403 }
    );
  }

  const { data: lessonRows, error: lessonIdsErr } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("course_id", params.id);

  if (lessonIdsErr) {
    return NextResponse.json({ error: lessonIdsErr.message }, { status: 500 });
  }

  const lessonIds = (lessonRows ?? [])
    .map((r) => r.id)
    .filter((id): id is string => typeof id === "string");

  if (lessonIds.length > 0) {
    const { count: pathCount, error: pathErr } = await supabase
      .from("learning_paths")
      .select("*", { count: "exact", head: true })
      .in("lesson_id", lessonIds);

    if (pathErr) {
      return NextResponse.json({ error: pathErr.message }, { status: 500 });
    }
    if (pathCount && pathCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete course because students have already started learning it",
        },
        { status: 400 }
      );
    }
  }

  const { count, error: cntErr } = await supabase
    .from("course_lessons")
    .select("*", { count: "exact", head: true })
    .eq("course_id", params.id)
    .eq("status", "published");

  if (cntErr) {
    return NextResponse.json({ error: cntErr.message }, { status: 500 });
  }
  if (count && count > 0) {
    return NextResponse.json(
      { error: "Cannot delete course with published lessons" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("courses").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
