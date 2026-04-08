import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đăng ký | EduAI",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Về trang chủ
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
          Đăng ký
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tạo tài khoản học sinh (mặc định role: student).
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
