"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export type AuthActionResult = {
  error?: string;
  success?: string;
  needsEmailConfirmation?: boolean;
};

async function logProfileForUser(userId: string, label: string) {
  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(`[auth:${label}] Lỗi đọc profiles:`, error.message);
    return;
  }
  console.log(`[auth:${label}] profiles row:`, profile);
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

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    await logProfileForUser(user.id, "login");
  }

  redirect("/dashboard");
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
    return { error: error.message };
  }

  if (data.user && !data.session) {
    return {
      needsEmailConfirmation: true,
      success:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.",
    };
  }

  if (data.session?.user?.id) {
    await logProfileForUser(data.session.user.id, "signup");
    redirect("/dashboard");
  }

  return { error: "Không tạo được phiên đăng nhập. Thử lại sau." };
}
