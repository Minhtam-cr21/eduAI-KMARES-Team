import { segmentMetadata } from "@/lib/seo/shared-metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = segmentMetadata({
  title: "Đăng nhập & đăng ký",
  description:
    "Đăng nhập hoặc tạo tài khoản EduAI để bắt đầu học lập trình cá nhân hóa.",
  noIndex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/images/logo.png" alt="EduAI" width={40} height={40} className="h-10 w-10" />
        <span className="text-2xl font-bold text-foreground">EduAI</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
