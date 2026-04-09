import { AdminShellNav } from "@/components/admin/admin-shell-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { requireAdmin } from "@/lib/auth/require-admin";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin("/admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80"
          >
            <Image src="/images/logo.png" alt="EduAI" width={28} height={28} className="h-7 w-7" />
            EduAI · Quản trị
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              Về học sinh
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AdminShellNav />
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
