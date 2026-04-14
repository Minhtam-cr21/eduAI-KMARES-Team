import { AdminShellNav } from "@/components/admin/admin-shell-nav";
import { requireAdmin } from "@/lib/auth/require-admin";
import { segmentMetadata } from "@/lib/seo/shared-metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = segmentMetadata({
  title: "Quản trị",
  description: "Quản trị nội dung và người dùng EduAI.",
  noIndex: true,
});

export const dynamic = "force-dynamic";

/**
 * Khu vực `/admin/*` (topics, lessons, …) — cùng shell với `app/(dashboard)/admin/`.
 */
export default async function AdminLayout({
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
            className="text-sm font-semibold text-foreground hover:opacity-80"
          >
            EduAI · Quản trị
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Về học sinh
          </Link>
        </div>
      </header>
      <AdminShellNav />
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
