"use client";

import { getBrowserSiteOrigin } from "@/lib/site-origin";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { GoogleSignInButton } from "./google-sign-in-button";

function translateSignupError(raw: string): string {
  const lower = raw.toLowerCase();
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
  return raw;
}

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", full_name: "" },
  });

  function onSubmit(data: SignupInput) {
    setServerError(null);
    setInfo(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const origin = getBrowserSiteOrigin();

      const { data: signData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            full_name: data.full_name?.trim() || null,
          },
        },
      });

      if (error) {
        setServerError(translateSignupError(error.message));
        return;
      }

      if (signData.user && !signData.session) {
        setInfo(
          "Đăng ký thành công! Kiểm tra email để xác nhận, sau đó đăng nhập."
        );
        return;
      }

      if (signData.session?.user) {
        const fullName = data.full_name?.trim() || null;
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: signData.session.user.id,
            full_name: fullName,
            role: "student",
          },
          {
            onConflict: "id",
            ignoreDuplicates: false,
          }
        );
        if (profileError) {
          setServerError(translateSignupError(profileError.message));
          return;
        }
        router.replace("/student");
        router.refresh();
        return;
      }

      setServerError("Không tạo được phiên đăng nhập. Vui lòng thử lại.");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-4"
    >
      <div className="space-y-1">
        <label
          htmlFor="full_name"
          className="text-sm font-medium text-neutral-700"
        >
          Họ tên (tuỳ chọn)
        </label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm outline-none ring-neutral-400 focus:ring-2"
          {...form.register("full_name")}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm outline-none ring-neutral-400 focus:ring-2"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-600">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="text-sm font-medium text-neutral-700"
        >
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm outline-none ring-neutral-400 focus:ring-2"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-red-600">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      {info && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </p>
      )}

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {isPending ? "Đang đăng ký…" : "Đăng ký"}
      </button>

      <div className="relative py-2 text-center text-xs text-neutral-500">
        <span className="bg-white px-2">hoặc</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-neutral-200" />
      </div>

      <GoogleSignInButton label="Đăng ký bằng Google" />

      <p className="text-center text-sm text-neutral-600">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
