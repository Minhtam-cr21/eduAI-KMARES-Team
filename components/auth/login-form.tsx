"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { studentPostAuthPath } from "@/lib/auth/student-post-auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleSignInButton } from "./google-sign-in-button";

type Props = {
  oauthError?: string;
};

export function LoginForm({ oauthError }: Props) {
  const router = useRouter();
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

  const DEMO_ACCOUNTS = [
    {
      label: "🎓 Học sinh",
      email: "hocsinh@demo.eduai.local",
      password: "Demo@123456",
      role: "student" as const,
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
    },
    {
      label: "👨‍🏫 Giáo viên",
      email: "giaovien@demo.eduai.local",
      password: "Demo@123456",
      role: "teacher" as const,
      color: "from-emerald-500 to-emerald-600",
      hoverColor: "hover:from-emerald-600 hover:to-emerald-700",
    },
    {
      label: "🛡️ Admin",
      email: "admin@demo.eduai.local",
      password: "Demo@123456",
      role: "student" as const, // admin không cần chọn role tab
      color: "from-violet-500 to-violet-600",
      hoverColor: "hover:from-violet-600 hover:to-violet-700",
    },
  ] as const;

  function loginAsDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setServerError(null);
    // Chuyển tab role cho đúng
    if (account.email !== "admin@demo.eduai.local") {
      handleRoleChange(account.role);
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error, data: authData } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        setServerError(`Demo login thất bại: ${error.message}`);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setServerError("Không lấy được thông tin user. Vui lòng thử lại.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, assessment_completed, onboarding_completed")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role === "admin") {
        router.replace("/admin");
      } else if (profile?.role === "teacher") {
        router.replace("/teacher");
      } else {
        router.replace(
          studentPostAuthPath({
            assessment_completed: profile?.assessment_completed,
            onboarding_completed: profile?.onboarding_completed,
          })
        );
      }
      router.refresh();
    });
  }

  function onSubmit(data: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error, data: authData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setServerError("Không tạo được phiên đăng nhập. Vui lòng thử lại.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, assessment_completed, onboarding_completed")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        setServerError(profileError.message);
        return;
      }

      if (!profile) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: authData.user?.user_metadata?.full_name ?? null,
          role: "student",
        });
        if (insertError) {
          setServerError(insertError.message);
          return;
        }
        router.replace("/student");
        router.refresh();
        return;
      }

      if (profile.role !== "admin") {
        if (selectedRole === "teacher" && profile.role !== "teacher") {
          await supabase.auth.signOut();
          setServerError(
            "Tài khoản này không phải là giáo viên. Vui lòng chọn đúng cổng đăng nhập hoặc liên hệ admin."
          );
          return;
        }
        if (selectedRole === "student" && profile.role === "teacher") {
          await supabase.auth.signOut();
          setServerError(
            "Tài khoản này là giáo viên. Vui lòng chọn cổng \"Giáo viên\" để đăng nhập."
          );
          return;
        }
      }

      if (profile.role === "admin") {
        router.replace("/admin");
      } else if (profile.role === "teacher") {
        router.replace("/teacher");
      } else {
        router.replace(
          studentPostAuthPath({
            assessment_completed: profile.assessment_completed,
            onboarding_completed: profile.onboarding_completed,
          })
        );
      }
      router.refresh();
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
            className="text-sm font-medium text-foreground/80"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none ring-ring focus:ring-2"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground/80"
          >
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none ring-ring focus:ring-2"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {(serverError || form.formState.errors.root) && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError ?? form.formState.errors.root?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {isPending
            ? "Đang đăng nhập…"
            : selectedRole === "teacher"
              ? "Đăng nhập (Giáo viên)"
              : "Đăng nhập (Học sinh)"}
        </button>

        {/* ── Demo Accounts ── */}
        <div className="rounded-xl border border-dashed border-border bg-muted/50 p-4">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            🚀 Tài khoản Demo
          </p>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={isPending}
                onClick={() => loginAsDemo(account)}
                className={`flex items-center justify-between rounded-lg bg-gradient-to-r px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:shadow-md disabled:opacity-60 ${account.color} ${account.hoverColor}`}
              >
                <span>{account.label}</span>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-normal">
                  {isPending ? "Đang vào…" : "Đăng nhập"}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Dành cho ban tổ chức demo — không dùng trên tài khoản thật
          </p>
        </div>

        <div className="relative py-2 text-center text-xs text-muted-foreground">
          <span className="bg-card px-2">hoặc</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
        </div>

        <GoogleSignInButton />

        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
          >
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
}
