"use client";

import { StudentDashboardModules } from "@/components/student/student-dashboard-modules";
import { StudentStatsCharts } from "@/components/student/student-stats-charts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  { label: "Assessment", href: "/assessment", icon: ClipboardList },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Kết nối GV", href: "/student/teachers", icon: Users },
];

function CourseCard({ c }: { c: EnrolledCourse }) {
  const tags = [c.course.category, c.course.course_type].filter(Boolean);
  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {c.course.title}
          </h3>
          {c.course.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {c.course.description}
            </p>
          )}
        </div>
        <Badge
          variant={c.status === "active" ? "success" : "secondary"}
          className="shrink-0"
        >
          {c.status === "active" ? "Active" : c.status}
        </Badge>
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          Đã đăng ký
        </span>
        <Link
          href={`/student/courses/${c.course.id}`}
          className="font-medium text-primary hover:underline"
        >
          View More →
        </Link>
      </div>
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border p-5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-3 h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

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

  const filtered =
    tab === "all"
      ? courses
      : tab === "active"
        ? courses.filter((c) => c.status === "active")
        : tab === "completed"
          ? courses.filter((c) => c.status === "completed")
          : courses;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Sub-nav */}
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

      <StudentStatsCharts />

      <StudentDashboardModules />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column: My Courses */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <BookOpen className="h-6 w-6 text-primary" />
              My Courses
            </h1>
            <Link
              href="/student/courses/explore"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              + Khám phá khóa học
            </Link>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
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
                  {courses.length === 0 && (
                    <Link
                      href="/student/courses/explore"
                      className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Khám phá khóa học →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((c) => (
                    <CourseCard key={c.course.id} c={c} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Right column: Schedule */}
        <aside>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <CalendarDays className="h-5 w-5 text-primary" />
              Lịch & lộ trình
            </h2>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Lịch học chi tiết theo lộ trình cá nhân hóa — xem sau khi hoàn thành trắc nghiệm và giáo viên duyệt lộ trình.
            </p>
            <Link
              href="/personalized-roadmap"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Mở lộ trình cá nhân hóa →
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
