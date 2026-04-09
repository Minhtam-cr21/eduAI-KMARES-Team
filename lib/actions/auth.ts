"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export type AuthActionResult = {
  error?: string;
  success?: string;
  needsEmailConfirmation?: boolean;
};

function translateAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email chưa xác nhận. Vui lòng kiểm tra hộp thư (kể cả spam).";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.";
  }
  if (lower.includes("signup is disabled") || lower.includes("signups not allowed")) {
    return "Chức năng đăng ký đang tắt. Liên hệ admin.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Quá nhiều lần thử. Vui lòng đợi vài phút rồi thử lại.";
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return "Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự, kết hợp chữ và số.";
  }
  if (lower.includes("email")) {
    return `Lỗi email: ${raw}`;
  }
  return raw;
}

async function ensureProfileExists(
  userId: string,
  fullName: string | null
): Promise<void> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    full_name: fullName,
    role: "student",
  });
  if (error) {
    console.error("[auth] ensureProfileExists insert failed:", error.message);
  }
}

type ProfileRow = {
  role: string;
  onboarding_completed: boolean | null;
} | null;

async function getProfile(userId: string): Promise<ProfileRow> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

function resolveRedirectFromProfile(profile: ProfileRow): string {
  if (!profile) return "/student";
  if (profile.role === "admin") return "/admin";
  if (profile.role === "teacher") return "/teacher";
  if (profile.onboarding_completed === true) return "/student";
  return "/onboarding";
}

export async function loginAction(
  input: unknown
): Promise<AuthActionResult | void> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ?? first.password?.[0] ?? "Dữ liệu không hợp lệ";
    return { error: msg };
  }

  const selectedRole = parsed.data.selectedRole ?? "student";

  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("[auth:login] signInWithPassword:", error.message);
    return { error: translateAuthError(error.message) };
  }

  const userId = data.user?.id;
  if (userId) {
    await ensureProfileExists(userId, data.user?.user_metadata?.full_name ?? null);

    const profile = await getProfile(userId);

    if (profile && profile.role !== "admin") {
      if (selectedRole === "teacher" && profile.role !== "teacher") {
        await supabase.auth.signOut();
        return {
          error:
            "Tài khoản này không phải là giáo viên. Vui lòng chọn đúng cổng đăng nhập hoặc liên hệ admin.",
        };
      }
      if (selectedRole === "student" && profile.role === "teacher") {
        await supabase.auth.signOut();
        return {
          error:
            "Tài khoản này là giáo viên. Vui lòng chọn cổng \"Giáo viên\" để đăng nhập.",
        };
      }
    }

    const dest = resolveRedirectFromProfile(profile);
    redirect(dest);
  }

  redirect("/student");
}

export async function signupAction(
  input: unknown
): Promise<AuthActionResult | void> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ?? first.password?.[0] ?? "Dữ liệu không hợp lệ";
    return { error: msg };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name?.trim() || null,
      },
    },
  });

  if (error) {
    console.error("[auth:signup] signUp:", error.message);
    return { error: translateAuthError(error.message) };
  }

  if (data.user && !data.session) {
    return {
      needsEmailConfirmation: true,
      success:
        "Đăng ký thành công! Kiểm tra email để xác nhận, sau đó đăng nhập.",
    };
  }

  if (data.session?.user?.id) {
    const userId = data.session.user.id;
    const fullName = parsed.data.full_name?.trim() || null;
    await ensureProfileExists(userId, fullName);
    redirect("/onboarding");
  }

  return { error: "Không tạo được phiên đăng nhập. Vui lòng thử lại." };
}
