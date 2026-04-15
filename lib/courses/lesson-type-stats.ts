/** Count lesson types from course_lessons (type + video_url fallback). */

export type LessonForStats = {
  type?: string | null;
  video_url?: string | null;
  time_estimate?: number | null;
};

export function lessonTypeStats(lessons: LessonForStats[]) {
  let video = 0;
  let textRead = 0;
  let quiz = 0;
  let totalMinutes = 0;

  for (const l of lessons) {
    const t = String(l.type ?? "").toLowerCase();
    const hasVideo = Boolean(l.video_url?.trim());
    if (t === "quiz") quiz++;
    else if (t === "video" || hasVideo) video++;
    else textRead++;

    const m = l.time_estimate;
    if (typeof m === "number" && m > 0) totalMinutes += m;
  }

  return {
    video,
    textRead,
    quiz,
    total: lessons.length,
    totalMinutes,
  };
}

export function levelLabelVi(level: string | null | undefined): string {
  switch (level) {
    case "intermediate":
      return "Trung cấp";
    case "advanced":
      return "Nâng cao";
    case "all_levels":
      return "Mọi cấp";
    default:
      return "Cơ bản";
  }
}
