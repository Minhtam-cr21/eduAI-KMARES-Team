import type { SupabaseClient } from "@supabase/supabase-js";

import { buildSmartScheduleAnalysis } from "./analysis";
import { loadScheduleLearnerContext } from "./learner-context";
import type {
  EnrichedScheduleItem,
  ScheduleAnalysisSnapshot,
  ScheduleSummary,
} from "./contracts";

type BaseScheduleRow = {
  id: string;
  due_date: string | null;
  status: string;
  miss_count: number | null;
  completed_at: string | null;
  path_id: string | null;
  lesson_id: string | null;
};

export type ScheduleSnapshot = {
  items: EnrichedScheduleItem[];
  summary: ScheduleSummary;
  analysis: ScheduleAnalysisSnapshot;
};

function buildEmptyScheduleSnapshot(): ScheduleSnapshot {
  const { items, summary, analysis } = buildSmartScheduleAnalysis([]);
  return {
    items,
    summary,
    analysis,
  };
}

export async function buildEnrichedScheduleSnapshot(
  supabase: SupabaseClient,
  rows: BaseScheduleRow[],
  options?: {
    studentId?: string | null;
  }
): Promise<{ data: ScheduleSnapshot; error: string | null }> {
  const listRaw = rows ?? [];
  const pathIds = Array.from(
    new Set(
      listRaw
        .map((row) => row.path_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let allowedPathIds = new Set<string>();
  if (pathIds.length > 0) {
    const { data: paths, error: pathErr } = await supabase
      .from("personalized_paths")
      .select("id, status")
      .in("id", pathIds);

    if (pathErr) {
      return { data: buildEmptyScheduleSnapshot(), error: pathErr.message };
    }

    for (const path of paths ?? []) {
      const status = (path.status as string | null) ?? "";
      if (status === "active" || status === "paused") {
        allowedPathIds.add(path.id as string);
      }
    }
  }

  const filteredRows = listRaw.filter((row) => {
    if (!row.path_id) return true;
    return allowedPathIds.has(row.path_id);
  });

  const lessonIds = Array.from(
    new Set(
      filteredRows
        .map((row) => row.lesson_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const lessonById = new Map<string, { id: string; title: string; course_id: string }>();
  const courseById = new Map<string, { id: string; title: string }>();

  if (lessonIds.length > 0) {
    const { data: lessons, error: lessonsErr } = await supabase
      .from("course_lessons")
      .select("id, title, course_id")
      .in("id", lessonIds);

    if (lessonsErr) {
      return { data: buildEmptyScheduleSnapshot(), error: lessonsErr.message };
    }

    const courseIds = new Set<string>();
    for (const lesson of lessons ?? []) {
      const id = lesson.id as string;
      lessonById.set(id, {
        id,
        title: (lesson.title as string) ?? "",
        course_id: lesson.course_id as string,
      });
      if (lesson.course_id) {
        courseIds.add(lesson.course_id as string);
      }
    }

    if (courseIds.size > 0) {
      const { data: courses, error: coursesErr } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", Array.from(courseIds));

      if (coursesErr) {
        return { data: buildEmptyScheduleSnapshot(), error: coursesErr.message };
      }

      for (const course of courses ?? []) {
        courseById.set(course.id as string, {
          id: course.id as string,
          title: (course.title as string) ?? "",
        });
      }
    }
  }

  const items: EnrichedScheduleItem[] = filteredRows.map((row) => {
    const lesson = row.lesson_id ? lessonById.get(row.lesson_id) : undefined;
    const course = lesson?.course_id ? courseById.get(lesson.course_id) : undefined;
    return {
      ...row,
      lesson: lesson ? { ...lesson, course: course ?? null } : null,
      priority: "normal",
      soft_deadline_level: null,
      priority_score: 0,
      adjustment_proposal: null,
    };
  });

  const learnerContext =
    options?.studentId
      ? await loadScheduleLearnerContext(supabase, options.studentId)
      : null;
  const { items: analyzedItems, summary, analysis } = buildSmartScheduleAnalysis(
    items,
    {
      learnerContext,
    }
  );
  return {
    data: {
      items: analyzedItems,
      summary,
      analysis,
    },
    error: null,
  };
}
