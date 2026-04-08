"use client";

import { signupAction } from "@/lib/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { GoogleSignInButton } from "./google-sign-in-button";

export function SignupForm() {
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
      const result = await signupAction(data);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      if (result?.needsEmailConfirmation && result.success) {
        setInfo(result.success);
      }
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
