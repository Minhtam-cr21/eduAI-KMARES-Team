import type { CourseType } from "@/types/database";
import type { GeneratedCourseOutline } from "@/lib/ai/generate-course-outline";

export type AILessonDraft = {
  title: string;
  content: string;
  video_url: string | null;
  code_template: string | null;
};

export type AICourseDraft = {
  title: string;
  description: string;
  content: string;
  course_type: CourseType;
  category: string;
  thumbnail_url: string | null;
  lessons: AILessonDraft[];
};

export function mapOutlineToDraft(outline: GeneratedCourseOutline): AICourseDraft {
  const category =
    outline.category?.trim() ||
    outline.course_title.slice(0, 80).trim() ||
    "Tổng quát";
  return {
    title: outline.course_title.trim(),
    description: outline.course_description.trim(),
    content: outline.course_description.trim(),
    course_type: outline.course_type ?? "skill",
    category: category.slice(0, 120),
    thumbnail_url: null,
    lessons: outline.lessons.map((l) => ({
      title: l.title.trim(),
      content: l.content,
      video_url: l.video_url ?? null,
      code_template: l.code_template ?? null,
    })),
  };
}
