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

/** `connection_requests` (migration 20250409000000). */
export type ConnectionRequestStatus = "pending" | "accepted" | "rejected";

export interface ConnectionRequest {
  id: string;
  student_id: string;
  teacher_id: string;
  goal: string;
  reason?: string | null;
  desired_roadmap?: string | null;
  available_time: string | null;
  status: ConnectionRequestStatus;
  teacher_response: string | null;
  created_at: string;
  responded_at: string | null;
  last_updated?: string | null;
}

/** `reports`. */
export type ReportType = "bug" | "content" | "other";
export type ReportStatus = "pending" | "resolved" | "rejected";

export interface Report {
  id: string;
  user_id: string;
  type: ReportType | null;
  description: string;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
}

/** `mbti_results`. */
export interface MbtiResult {
  id: string;
  user_id: string;
  mbti_type: string;
  test_date: string;
}

/** `quizzes` (migration 029). */
export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  lesson_id: string | null;
  questions: unknown;
  time_limit: number | null;
  passing_score: number | null;
  created_by: string | null;
  is_published: boolean | null;
  created_at: string;
}

/** `quiz_attempts`. */
export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number | null;
  answers: unknown;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
