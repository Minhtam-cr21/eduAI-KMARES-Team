export type TeacherStudentRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  goal: string | null;
  hours_per_day: number | null;
  learning_paths_total: number;
  learning_paths_completed: number;
};

/** RPC `teacher_students_completed_assessment_pending_path`. */
export type CompletedAssessmentPendingStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  assessment_completed_at: string | null;
  mbti_type: string | null;
};
