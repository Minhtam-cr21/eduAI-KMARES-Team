/**
 * EduAI — Draft types for target API contracts (`/api/eduai/v1/*`).
 * Not wired into the app yet; use as reference contract when implementing.
 */

// --- Shared ---

export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

// --- Student dashboard ---

export interface StudentDashboardResponse {
  profile: {
    id: UUID;
    full_name: string | null;
    avatar_url: string | null;
    role: "student";
  };
  courses: {
    enrolled: EnrolledCourseSummary[];
    suggested_count?: number;
  };
  personalized_path: PersonalizedPathSummary | null;
  schedule: {
    upcoming: ScheduleItemPublic[];
    week_stats?: { date: ISODate; completed_count: number }[];
  };
  progress: {
    lessons_completed_total: number;
    quizzes_passed_total?: number;
    active_courses_count: number;
  };
}

export interface EnrolledCourseSummary {
  course_id: UUID;
  title: string;
  thumbnail_url: string | null;
  enrollment_status: "active" | "completed" | "dropped";
  progress_ratio: number; // 0..1
  next_lesson_id: UUID | null;
}

export interface PersonalizedPathSummary {
  path_id: UUID;
  status: string;
  teacher_id: UUID | null;
  course_sequence_length: number;
  updated_at: ISODateTime;
}

export interface ScheduleItemPublic {
  id: UUID;
  path_id: UUID;
  lesson_id: UUID;
  course_id: UUID;
  due_date: ISODate;
  status: "pending" | "completed" | "missed" | "frozen";
  miss_count?: number;
  student_note: string | null;
  is_busy: boolean | null;
  lesson_title?: string;
  course_title?: string;
}

// --- Teacher dashboard ---

export interface TeacherDashboardResponse {
  profile: {
    id: UUID;
    full_name: string | null;
    role: "teacher" | "admin";
  };
  counts: {
    published_courses: number;
    active_students: number;
    pending_path_reviews: number;
    schedule_items_missed_recent: number;
  };
  alerts: TeacherDashboardAlert[];
  recent_activity: TeacherActivityRow[];
}

export interface TeacherDashboardAlert {
  type: "path_pending" | "schedule_missed" | "student_inactive" | "feedback_pending";
  student_id: UUID;
  student_name: string | null;
  message: string;
  ref_id?: UUID;
  severity: "info" | "warning";
}

export interface TeacherActivityRow {
  at: ISODateTime;
  event_type: string;
  student_id: UUID;
  summary: string;
}

// --- Course management (teacher) ---

export interface CourseListQuery {
  scope?: "mine" | "published" | "all";
  page?: number;
  page_size?: number;
}

export interface CourseCreateBody {
  title: string;
  description?: string | null;
  course_type: "skill" | "role";
  category: string;
  thumbnail_url?: string | null;
}

export interface CourseUpdateBody extends Partial<CourseCreateBody> {
  status?: "pending" | "published" | "rejected";
}

export interface CourseDetailResponse {
  course: CoursePublic;
  lessons: CourseLessonPublic[];
  benefits?: unknown[];
  chapters?: unknown[];
}

export interface CoursePublic {
  id: UUID;
  title: string;
  description: string | null;
  course_type: "skill" | "role";
  category: string;
  teacher_id: UUID | null;
  status: string;
  thumbnail_url: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CourseLessonPublic {
  id: UUID;
  course_id: UUID;
  title: string;
  order_index: number | null;
  status: string;
  video_url: string | null;
}

// --- Personalized path ---

export interface CourseSequenceEntry {
  course_id: UUID;
  order_index: number;
  due_date?: ISODate | null;
  note?: string | null;
}

export interface PersonalizedPathDto {
  id: UUID;
  student_id: UUID;
  teacher_id: UUID | null;
  course_sequence: CourseSequenceEntry[] | null;
  status: string;
  student_feedback: string | null;
  teacher_feedback: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface PathSuggestRequestBody {
  student_id: UUID;
  /** Optional override; default from profile + career data */
  context?: Record<string, unknown>;
}

export interface PathSuggestResponse {
  proposed_sequence: CourseSequenceEntry[];
  rationale?: string;
  model?: string;
}

export interface PathApproveBody {
  course_sequence: CourseSequenceEntry[];
  teacher_feedback?: string | null;
}

// --- Smart schedule ---

export interface ScheduleListQuery {
  from?: ISODate;
  to?: ISODate;
  status?: "pending" | "completed" | "missed" | "frozen";
}

export interface SchedulePatchBody {
  student_note?: string | null;
  is_busy?: boolean;
}

export interface ScheduleCompleteBody {
  completed_at?: ISODateTime;
}

// --- AI schedule insights (teacher) ---

export interface AiScheduleInsightRequestBody {
  student_id: UUID;
  /** Window for analysis */
  from?: ISODate;
  to?: ISODate;
  /** Optional focus: missed, frozen, workload */
  focus?: "adherence" | "workload" | "risk";
}

export interface AiScheduleInsightResponse {
  insight_id?: UUID;
  summary: string;
  bullets: string[];
  suggested_actions: {
    action: "extend_deadline" | "reduce_load" | "reorder_lessons" | "notify_student";
    payload?: Record<string, unknown>;
  }[];
  confidence?: "low" | "medium" | "high";
  generated_at: ISODateTime;
}

// --- Student progress (explicit resource) ---

export interface StudentProgressResponse {
  user_id: UUID;
  by_course: {
    course_id: UUID;
    enrollment_status: string;
    lessons_total: number;
    lessons_completed: number;
    last_activity_at: ISODateTime | null;
  }[];
  by_lesson: {
    course_id: UUID;
    lesson_id: UUID;
    status: "pending" | "completed";
    completed_at: ISODateTime | null;
  }[];
}

// --- Teacher insights bundle ---

export interface TeacherStudentInsightsResponse {
  student: {
    id: UUID;
    full_name: string | null;
    email?: string | null;
  };
  progress: StudentProgressResponse;
  schedule_health: {
    pending_count: number;
    missed_count: number;
    frozen_count: number;
    completion_rate_30d?: number;
  };
  assessment_summary?: Record<string, unknown> | null;
  behavior_highlights: {
    event_type: string;
    count: number;
    last_at: ISODateTime | null;
  }[];
  quiz_summary?: {
    quiz_id: UUID;
    lesson_id: UUID | null;
    best_score: number | null;
    attempts: number;
  }[];
  ai?: AiScheduleInsightResponse | null;
}
