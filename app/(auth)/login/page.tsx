import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đăng nhập | EduAI",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const oauthError = searchParams.error
    ? decodeURIComponent(searchParams.error)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Về trang chủ
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
          Đăng nhập
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Dùng email hoặc Google để vào EduAI.
        </p>
      </div>
      <LoginForm oauthError={oauthError} />
    </div>
  );
}
