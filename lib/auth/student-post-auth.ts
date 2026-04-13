/**
 * Đích điều hướng học sinh sau đăng nhập / OAuth / đăng ký.
 * Luôn về dashboard; chưa làm trắc nghiệm thì các module lộ trình / định hướng sẽ gợi ý qua dialog (Bước 3).
 */
export function studentPostAuthPath(_profile: {
  assessment_completed?: boolean | null;
  onboarding_completed?: boolean | null;
} | null): "/student" {
  return "/student";
}
