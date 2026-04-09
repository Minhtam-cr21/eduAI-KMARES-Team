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
  available_time: string | null;
  status: ConnectionRequestStatus;
  teacher_response: string | null;
  created_at: string;
  responded_at: string | null;
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

/** `practice_exercises` (migration 20250409000000). */
export type PracticeExerciseLanguage = "cpp" | "java" | "python";
export type PracticeExerciseDifficulty = "easy" | "medium" | "hard";

export interface PracticeExercise {
  id: string;
  title: string;
  description: string | null;
  initial_code: string | null;
  test_code: string | null;
  language: PracticeExerciseLanguage | null;
  difficulty: PracticeExerciseDifficulty | null;
  created_at: string;
}

/** `practice_submissions`. */
export interface PracticeSubmission {
  id: string;
  user_id: string;
  exercise_id: string;
  code: string | null;
  output: string | null;
  error: string | null;
  ai_suggestion: string | null;
  created_at: string;
}
