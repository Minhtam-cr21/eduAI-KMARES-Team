/**
 * Đích điều hướng học sinh sau đăng nhập / OAuth / đăng ký.
 * Ưu tiên `assessment_completed`; giữ `onboarding_completed` (legacy DB) để user cũ vẫn vào /student.
 */
export function studentPostAuthPath(profile: {
  assessment_completed?: boolean | null;
  onboarding_completed?: boolean | null;
} | null): "/student" | "/assessment" {
  if (!profile) return "/assessment";
  if (profile.assessment_completed === true) return "/student";
  if (profile.onboarding_completed === true) return "/student";
  return "/assessment";
}
