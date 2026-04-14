"use client";

import { StudentCourseCard, type StudentCatalogCourse } from "@/components/student/course-card";
import { CourseGrid } from "@/components/student/course-grid";
import { StudentStatsCards } from "@/components/student/student-stats";
import type { StudentStatsPayload } from "@/components/student/student-stats-charts";
import { StudentStatsCharts } from "@/components/student/student-stats-charts";
import { StudentDashboardModules } from "@/components/student/student-dashboard-modules";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

type EnrolledCourse = {
  course: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    course_type: string | null;
  };
  status: string;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Quiz", href: "/quizzes", icon: ClipboardList },
  { label: "Trắc nghiệm cá nhân", href: "/assessment", icon: ClipboardList },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Kết nối GV", href: "/student/teachers", icon: Users },
];

function CourseRowCard({ c }: { c: EnrolledCourse }) {
  const tags = [c.course.category, c.course.course_type].filter(Boolean);
  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {c.course.title}
          </h3>
          {c.course.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {c.course.description}
            </p>
          ) : null}
        </div>
        <Badge
          variant={c.status === "active" ? "success" : "secondary"}
          className="shrink-0"
        >
          {c.status === "active" ? "Đang học" : c.status}
        </Badge>
      </div>
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}
      <Link
        href={`/student/courses/${c.course.id}`}
        className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
      >
        Vào khóa học →
      </Link>
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
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
        courses?: EnrolledCourse[];
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
        const res = await fetch("/api/courses?limit=6");
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

  const filtered =
    tab === "all"
      ? courses
      : tab === "active"
        ? courses.filter((c) => c.status === "active")
        : tab === "completed"
          ? courses.filter((c) => c.status === "completed")
          : tab === "upcoming"
            ? courses.filter((c) => c.status !== "completed" && c.status !== "active")
            : courses;

  const greeting = profileName?.trim() || "bạn";
  const recentList = stats?.recent_activity ?? [];

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
                {(greeting[0] ?? "U").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Xin chào,</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting} <Sparkles className="ml-1 inline h-5 w-5 text-amber-500" />
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

      <StudentDashboardModules />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
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
                <CourseSkeleton />
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {courses.length === 0
                      ? "Bạn chưa đăng ký khóa học nào."
                      : "Không có khóa học ở trạng thái này."}
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
                <div className="space-y-3">
                  {filtered.map((c) => (
                    <CourseRowCard key={c.course.id} c={c} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Gợi ý khóa học
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
              <TooltipProvider delayDuration={200}>
                <CourseGrid className="sm:grid-cols-2 lg:grid-cols-3">
                  {suggested.slice(0, 6).map((c) => (
                    <StudentCourseCard
                      key={c.id}
                      course={c}
                      enrolled={courses.some((x) => x.course.id === c.id)}
                    />
                  ))}
                </CourseGrid>
              </TooltipProvider>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <StudentStatsCharts
            compact
            fetchEnabled={false}
            stats={stats}
            statsLoading={statsLoading}
          />

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" />
              Hoạt động gần đây
            </h3>
            {statsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : recentList.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Hoàn thành bài trong lịch hoặc quiz để thấy hoạt động tại đây.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentList.map((item, i) => (
                  <li
                    key={`${item.at}-${i}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 text-foreground">
                      <span className="text-muted-foreground text-xs">
                        {item.kind === "quiz" ? "Quiz" : "Bài học"}
                      </span>
                      <br />
                      <span className="line-clamp-2 font-medium">{item.title}</span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {new Date(item.at).toLocaleDateString("vi-VN")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Lịch & lộ trình
            </h3>
            <p className="text-muted-foreground text-sm">
              Lịch học theo lộ trình cá nhân — xem sau khi hoàn thành trắc nghiệm và giáo viên duyệt.
            </p>
            <Link
              href="/personalized-roadmap"
              className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Mở lộ trình →
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
