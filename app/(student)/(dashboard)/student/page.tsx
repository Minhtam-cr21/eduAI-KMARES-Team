"use client";

import {
  StudentCourseCard,
  type StudentCatalogCourse,
} from "@/components/student/course-card";
import {
  EnrolledCourseCard,
  type EnrolledCourseRow,
} from "@/components/student/enrolled-course-card";
import { StudentStatsCards } from "@/components/student/student-stats";
import type { StudentStatsPayload } from "@/components/student/student-stats-charts";
import { StudentDashboardModules } from "@/components/student/student-dashboard-modules";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
const NAV_ITEMS = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Quiz", href: "/quizzes", icon: ClipboardList },
  { label: "Trắc nghiệm cá nhân", href: "/assessment", icon: ClipboardList },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Kết nối GV", href: "/student/teachers", icon: Users },
  { label: "Yêu cầu kết nối", href: "/student/connections", icon: Link2 },
];

function EnrolledGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState<EnrolledCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<StudentCatalogCourse[]>([]);
  const [stats, setStats] = useState<StudentStatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/courses/enrolled");
      if (!res.ok) {
        setCourses([]);
        return;
      }
      const json = (await res.json()) as {
        courses?: EnrolledCourseRow[];
      };
      setCourses(json.courses ?? []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        const j = (await res.json()) as {
          profile?: {
            full_name?: string | null;
            avatar_url?: string | null;
          };
        };
        if (cancelled || !res.ok) return;
        setProfileName(j.profile?.full_name ?? null);
        setAvatarUrl(j.profile?.avatar_url ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetch("/api/student/stats");
        const j = (await res.json()) as StudentStatsPayload & { error?: string };
        if (cancelled || !res.ok) {
          if (!cancelled) setStats(null);
          return;
        }
        if (!cancelled) setStats(j);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses?limit=6&sort=popular");
        const j = (await res.json()) as { data?: StudentCatalogCourse[] };
        if (cancelled || !res.ok) return;
        setSuggested(j.data ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enrolledIds = new Set(courses.map((c) => c.course.id));

  const filtered =
    tab === "all"
      ? courses
      : tab === "active"
        ? courses.filter((c) => c.enrollment.status === "active")
        : tab === "completed"
          ? courses.filter((c) => c.enrollment.status === "completed")
          : tab === "upcoming"
            ? courses.filter(
                (c) =>
                  c.enrollment.status !== "completed" &&
                  c.enrollment.status !== "active"
              )
            : courses;

  const displayName = profileName?.trim() || "bạn";
  const emptyTabMessage =
    "Kh\u00F4ng c\u00F3 kh\u00F3a h\u1ECDc \u1EDF tr\u1EA1ng th\u00E1i n\u00E0y.";
  const suggestedSectionTitle = "G\u1EE3i \u00FD kh\u00F3a h\u1ECDc";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-8 flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              item.href === "/student"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-background bg-muted shadow">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
                {(displayName[0] ?? "U").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Xin chào, {displayName}. Chào mừng bạn đến với EduAI.{" "}
              <Sparkles className="ml-1 inline h-5 w-5 text-amber-500" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Tiếp tục hành trình học tập của bạn.
            </p>
          </div>
        </div>
        <Link
          href="/student/courses/explore"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
        >
          + Khám phá khóa học
        </Link>
      </header>

      <StudentStatsCards
        className="mb-8"
        fetchEnabled={false}
        stats={stats}
        statsLoading={statsLoading}
      />

      <StudentDashboardModules stats={stats} statsLoading={statsLoading} />

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            Khóa học của tôi
          </h2>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 w-full flex-wrap justify-start">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="active">Đang học</TabsTrigger>
            <TabsTrigger value="upcoming">Sắp tới</TabsTrigger>
            <TabsTrigger value="completed">Đã xong</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {loading ? (
              <EnrolledGridSkeleton />
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {courses.length === 0
                    ? "Bạn chưa đăng ký khóa học nào."
                    : emptyTabMessage}
                </p>
                {courses.length === 0 ? (
                  <Link
                    href="/student/courses/explore"
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Khám phá khóa học →
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((row) => (
                  <EnrolledCourseCard key={row.course.id} row={row} enrolled />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {suggestedSectionTitle}
          </h2>
          {suggested.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Đang tải gợi ý… hoặc{" "}
              <Link href="/student/courses/explore" className="text-primary underline">
                mở danh sách đầy đủ
              </Link>
              .
            </p>
          ) : (
            <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
              {suggested.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  className="w-[min(100%,280px)] shrink-0 px-1 sm:w-[260px]"
                >
                  <StudentCourseCard course={c} enrolled={enrolledIds.has(c.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
