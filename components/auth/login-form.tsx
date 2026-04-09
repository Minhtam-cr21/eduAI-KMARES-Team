"use client";

import { loginAction } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleSignInButton } from "./google-sign-in-button";

type Props = {
  oauthError?: string;
};

export function LoginForm({ oauthError }: Props) {
  const [serverError, setServerError] = useState<string | null>(
    oauthError ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">(
    "student"
  );

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", selectedRole: "student" },
  });

  function onSubmit(data: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction({ ...data, selectedRole });
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  function handleRoleChange(value: string) {
    const role = value as "student" | "teacher";
    setSelectedRole(role);
    form.setValue("selectedRole", role);
    setServerError(null);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <Tabs
        value={selectedRole}
        onValueChange={handleRoleChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">Học sinh</TabsTrigger>
          <TabsTrigger value="teacher">Giáo viên</TabsTrigger>
        </TabsList>
      </Tabs>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-sm font-medium text-neutral-700"
          >
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
            autoComplete="current-password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm outline-none ring-neutral-400 focus:ring-2"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {(serverError || form.formState.errors.root) && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError ?? form.formState.errors.root?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {isPending
            ? "Đang đăng nhập…"
            : selectedRole === "teacher"
              ? "Đăng nhập (Giáo viên)"
              : "Đăng nhập (Học sinh)"}
        </button>

        <div className="relative py-2 text-center text-xs text-neutral-500">
          <span className="bg-white px-2">hoặc</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-neutral-200" />
        </div>

        <GoogleSignInButton />

        <p className="text-center text-sm text-neutral-600">
          Chưa có tài khoản?{" "}
          <Link
            href="/signup"
            className="font-medium text-neutral-900 underline"
          >
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
}
