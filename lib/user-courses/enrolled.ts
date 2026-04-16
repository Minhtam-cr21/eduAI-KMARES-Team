import type { SupabaseClient } from "@supabase/supabase-js";

export type EnrolledCoursesPayload = {
  courses: Array<{
    enrollment: {
      id: string;
      status: string;
      enrolled_at: string;
      completed_at: string | null;
    };
    course: {
      id: string;
      title?: string;
      description?: string | null;
      thumbnail_url?: string | null;
      image_url?: string | null;
      course_type?: string;
      category?: string;
    };
    teacher: { full_name: string | null; avatar_url: string | null } | null;
    completed_lessons: number;
    total_lessons: number;
  }>;
};

export async function loadStudentEnrolledCourses(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  data: EnrolledCoursesPayload | null;
  error: string | null;
  status: number;
}> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "student") {
    return {
      data: null,
      error: "Chỉ học sinh mới xem được danh sách này.",
      status: 403,
    };
  }

  const { data: rows, error } = await supabase
    .from("user_courses")
    .select("id, course_id, status, enrolled_at, completed_at")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message, status: 500 };
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return { data: { courses: [] }, error: null, status: 200 };
  }

  const courseIds = list.map((row) => row.course_id as string);
  const { data: coursesData, error: coursesErr } = await supabase
    .from("courses")
    .select(
      "id, title, description, thumbnail_url, image_url, course_type, category, category_id, teacher_id, status, price, original_price, duration_hours, total_lessons, rating, reviews_count, level"
    )
    .in("id", courseIds);

  if (coursesErr) {
    return { data: null, error: coursesErr.message, status: 500 };
  }

  const courseMap = new Map((coursesData ?? []).map((course) => [course.id as string, course]));
  const teacherIds = Array.from(
    new Set(
      (coursesData ?? [])
        .map((course) => course.teacher_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );

  const teacherMap = new Map<
    string,
    { full_name: string | null; avatar_url: string | null }
  >();
  if (teacherIds.length > 0) {
    const { data: teacherRows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", teacherIds);

    for (const teacher of teacherRows ?? []) {
      teacherMap.set(teacher.id as string, {
        full_name: (teacher.full_name as string | null) ?? null,
        avatar_url: (teacher.avatar_url as string | null) ?? null,
      });
    }
  }

  const { data: lessonRows } = await supabase
    .from("course_lessons")
    .select("course_id")
    .eq("status", "published")
    .in("course_id", courseIds);

  const publishedByCourse = new Map<string, number>();
  for (const lesson of lessonRows ?? []) {
    const courseId = lesson.course_id as string;
    publishedByCourse.set(courseId, (publishedByCourse.get(courseId) ?? 0) + 1);
  }

  const { data: progressRows } = await supabase
    .from("user_course_progress")
    .select("course_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("course_id", courseIds);

  const completedByCourse = new Map<string, number>();
  for (const progress of progressRows ?? []) {
    const courseId = progress.course_id as string;
    completedByCourse.set(
      courseId,
      (completedByCourse.get(courseId) ?? 0) + 1
    );
  }

  return {
    data: {
      courses: list.map((enrollment) => {
        const courseId = enrollment.course_id as string;
        const course = courseMap.get(courseId);
        const teacherId = course?.teacher_id as string | null | undefined;
        return {
          enrollment: {
            id: enrollment.id,
            status: enrollment.status,
            enrolled_at: enrollment.enrolled_at,
            completed_at: enrollment.completed_at,
          },
          course: course ?? { id: courseId },
          teacher: teacherId ? teacherMap.get(teacherId) ?? null : null,
          completed_lessons: completedByCourse.get(courseId) ?? 0,
          total_lessons: publishedByCourse.get(courseId) ?? 0,
        };
      }),
    },
    error: null,
    status: 200,
  };
}
