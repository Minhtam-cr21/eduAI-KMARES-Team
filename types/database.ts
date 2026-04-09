/** Bảng `courses` (schema migration 20250409000000). */
export type CourseType = "skill" | "role";

export type CourseStatus = "pending" | "published" | "rejected";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  course_type: CourseType;
  category: string;
  teacher_id: string | null;
  status: CourseStatus;
  enrolled_count: number | null;
  thumbnail_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type CourseLessonStatus = "pending" | "published" | "rejected";

export interface CourseLesson {
  id: string;
  course_id: string | null;
  title: string;
  content: string | null;
  video_url: string | null;
  code_template: string | null;
  order_index: number | null;
  status: CourseLessonStatus;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Hàng join profiles (API trả về key `teacher` sau khi map). */
export interface CourseTeacherPreview {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CourseWithTeacher extends Course {
  teacher?: CourseTeacherPreview | null;
  profiles?: CourseTeacherPreview | null;
}
