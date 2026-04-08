import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">EduAI</h1>
      <p className="text-neutral-600">Trang chủ</p>
      <div className="flex gap-4 text-sm">
        <Link
          href="/login"
          className="font-medium text-neutral-900 underline underline-offset-4"
        >
          Đăng nhập
        </Link>
        <Link
          href="/signup"
          className="font-medium text-neutral-900 underline underline-offset-4"
        >
          Đăng ký
        </Link>
        <Link
          href="/dashboard"
          className="font-medium text-neutral-600 underline underline-offset-4"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
