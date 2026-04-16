import type { SupabaseClient } from "@supabase/supabase-js";

import { generatePathFromAssessment } from "@/lib/assessment/path-generator";
import { teacherPathReviewRecordSchema } from "@/lib/teacher/review-contracts";
import { listTeacherReviewEvents } from "@/lib/teacher/review-store";

export type TeacherPersonalizedPathEditorData = {
  path: {
    id: string;
    student_id: string;
    teacher_id: string | null;
    course_sequence: unknown;
    status: string;
    student_feedback: string | null;
    teacher_feedback: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  suggested: Awaited<ReturnType<typeof generatePathFromAssessment>> | null;
  pathReview: ReturnType<typeof teacherPathReviewRecordSchema.parse> | null;
  pathReviewHistory: Array<ReturnType<typeof teacherPathReviewRecordSchema.parse>>;
  courses: Array<{ id: string; title: string; category: string }>;
};

export async function loadTeacherPersonalizedPathEditorData(args: {
  supabase: SupabaseClient;
  userId: string;
  studentId: string;
  isAdmin: boolean;
}): Promise<{ data: TeacherPersonalizedPathEditorData | null; error: string | null; status: number }> {
  const { supabase, userId, studentId, isAdmin } = args;

  const { data: path, error: pathErr } = await supabase
    .from("personalized_paths")
    .select(
      "id, student_id, teacher_id, course_sequence, status, student_feedback, teacher_feedback, created_at, updated_at"
    )
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pathErr) {
    return { data: null, error: pathErr.message, status: 500 };
  }

  if (
    path &&
    !isAdmin &&
    path.teacher_id != null &&
    path.teacher_id !== userId
  ) {
    return { data: null, error: "Forbidden", status: 403 };
  }

  const { data: courses, error: coursesErr } = await supabase
    .from("courses")
    .select("id, title, category")
    .eq("status", "published")
    .order("title", { ascending: true });

  if (coursesErr) {
    return { data: null, error: coursesErr.message, status: 500 };
  }

  if (!path) {
    let suggested: Awaited<ReturnType<typeof generatePathFromAssessment>> | null = null;
    try {
      suggested = await generatePathFromAssessment(studentId, supabase);
    } catch {
      suggested = null;
    }

    return {
      data: {
        path: null,
        suggested,
        pathReview: null,
        pathReviewHistory: [],
        courses: (courses ?? []) as Array<{ id: string; title: string; category: string }>,
      },
      error: null,
      status: 200,
    };
  }

  const reviewResult = await listTeacherReviewEvents(supabase, {
    reviewKind: "personalized_path",
    teacherId: isAdmin ? undefined : userId,
    studentId,
    pathId: path.id as string,
    limit: 5,
  });

  if (reviewResult.error) {
    return { data: null, error: reviewResult.error, status: 500 };
  }

  const parsedReviews = reviewResult.data
    .map((row) =>
      teacherPathReviewRecordSchema.safeParse({
        ...row,
        snapshot: row.snapshot,
      })
    )
    .filter((result) => result.success)
    .map((result) => result.data);

  return {
    data: {
      path: {
        id: path.id as string,
        student_id: path.student_id as string,
        teacher_id: (path.teacher_id as string | null) ?? null,
        course_sequence: path.course_sequence,
        status: path.status as string,
        student_feedback: (path.student_feedback as string | null) ?? null,
        teacher_feedback: (path.teacher_feedback as string | null) ?? null,
        created_at: path.created_at as string,
        updated_at: path.updated_at as string,
      },
      suggested: null,
      pathReview: parsedReviews[0] ?? null,
      pathReviewHistory: parsedReviews,
      courses: (courses ?? []) as Array<{ id: string; title: string; category: string }>,
    },
    error: null,
    status: 200,
  };
}
