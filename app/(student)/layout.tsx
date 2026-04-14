import { StudentNav } from "@/components/student/student-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { segmentMetadata } from "@/lib/seo/shared-metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = segmentMetadata({
  title: "Học tập",
  description:
    "Dashboard học sinh EduAI: khóa học, quiz, trắc nghiệm định hướng và lộ trình cá nhân hóa.",
  noIndex: true,
});

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80"
          >
            <Image src="/images/logo.png" alt="EduAI" width={28} height={28} className="h-7 w-7" />
            EduAI
          </Link>
          <div className="flex items-center gap-2">
            <StudentNav />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
