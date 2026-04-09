export type TeacherStudentRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  goal: string | null;
  hours_per_day: number | null;
  learning_paths_total: number;
  learning_paths_completed: number;
};
