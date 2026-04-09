import type { SupabaseClient } from "@supabase/supabase-js";
import {
  lessonGoalsMatchUser,
  mapProfileGoalToSlug,
  type GoalSlug,
} from "@/lib/goals";

type LessonRow = {
  id: string;
  topic_id: string;
  order_index: number;
  goals: string[] | null;
};

/**
 * Lấy lesson đã publish, sắp xếp theo topic.order_index → lesson.order_index,
 * lọc theo goal user. Chèn các bản ghi còn thiếu vào learning_paths (không xóa cũ).
 */
export async function insertMissingLearningPathsForUser(
  supabase: SupabaseClient,
  params: {
    userId: string;
    profileGoal: string | null | undefined;
    hoursPerDay: number;
  }
): Promise<{ inserted: number }> {
  const logTag = `[insertMissingLearningPaths user=${params.userId}]`;
  const hoursPerDay =
    typeof params.hoursPerDay === "number" && params.hoursPerDay >= 1
      ? params.hoursPerDay
      : 2;
  const userSlug: GoalSlug = mapProfileGoalToSlug(params.profileGoal);

  try {
    const { count: publishedLessonCount, error: countErr } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);

    if (countErr) {
      console.error(logTag, "lessons count error", countErr.message);
    } else {
      console.log(logTag, "published lessons (global count)", publishedLessonCount ?? 0);
    }

    const { data: topics, error: topicsErr } = await supabase
      .from("topics")
      .select("id, order_index")
      .eq("is_published", true)
      .order("order_index", { ascending: true });

    if (topicsErr) {
      console.error(logTag, "topics select error", topicsErr.message);
      throw new Error(topicsErr.message);
    }

    const topicList = topics ?? [];
    if (topicList.length === 0) {
      console.log(logTag, "no published topics → inserted 0");
      return { inserted: 0 };
    }

    const topicIds = topicList.map((t) => t.id);
    const { data: lessonsRaw, error: lessonsErr } = await supabase
      .from("lessons")
      .select("id, topic_id, order_index, goals")
      .in("topic_id", topicIds)
      .eq("is_published", true);

    if (lessonsErr) {
      console.error(logTag, "lessons select error", lessonsErr.message);
      throw new Error(lessonsErr.message);
    }

    const byTopic = new Map<string, LessonRow[]>();
    for (const tid of topicIds) {
      byTopic.set(tid, []);
    }
    for (const row of (lessonsRaw ?? []) as LessonRow[]) {
      const arr = byTopic.get(row.topic_id);
      if (arr) arr.push(row);
    }
    for (const arr of Array.from(byTopic.values())) {
      arr.sort((a, b) => a.order_index - b.order_index);
    }

    const ordered: LessonRow[] = topicList.flatMap(
      (t) => byTopic.get(t.id) ?? []
    );

    const filtered = ordered.filter((l) =>
      lessonGoalsMatchUser(l.goals, userSlug)
    );

    console.log(
      logTag,
      `goalSlug=${userSlug} topics=${topicList.length} publishedLessonsInTopics=${ordered.length} afterGoalFilter=${filtered.length}`
    );

    if (filtered.length === 0) {
      return { inserted: 0 };
    }

    const { data: existingPaths, error: exErr } = await supabase
      .from("learning_paths")
      .select("lesson_id")
      .eq("student_id", params.userId);

    if (exErr) {
      console.error(logTag, "learning_paths select error", exErr.message);
      throw new Error(exErr.message);
    }

    const existing = new Set(
      (existingPaths ?? []).map((r: { lesson_id: string }) => r.lesson_id)
    );

    const lessonsPerDay = hoursPerDay < 2 ? 1 : 2;
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const rows: {
      student_id: string;
      lesson_id: string;
      due_date: string;
      status: "pending";
    }[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const lesson = filtered[i];
      if (existing.has(lesson.id)) continue;
      const dayOffset = Math.floor(i / lessonsPerDay);
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      const due = d.toISOString().slice(0, 10);
      rows.push({
        student_id: params.userId,
        lesson_id: lesson.id,
        due_date: due,
        status: "pending",
      });
    }

    if (rows.length === 0) {
      console.log(
        logTag,
        `existingPaths=${existing.size} nothing new to insert`
      );
      return { inserted: 0 };
    }

    const { error: insertErr } = await supabase.from("learning_paths").insert(rows);

    if (insertErr) {
      console.error(logTag, "learning_paths insert error", insertErr.message);
      throw new Error(insertErr.message);
    }

    console.log(logTag, `inserted ${rows.length} rows`);
    return { inserted: rows.length };
  } catch (e) {
    console.error(logTag, "failed", e);
    throw e;
  }
}
