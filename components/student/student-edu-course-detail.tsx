"use client";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen, CheckCircle2, Circle, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ContentRow = { id: string; content_type: string };
type LessonRow = {
  id: string;
  title: string;
  order: number;
  lesson_type: string;
  contents: ContentRow[];
};
type ModuleRow = {
  id: string;
  title: string;
  order: number;
  lessons: LessonRow[];
};

type ProgressRow = {
  lesson_id: string;
  status: string;
  completion_percentage: number | null;
};

export function StudentEduCourseDetail({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Record<string, unknown> | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [progressByLesson, setProgressByLesson] = useState<
    Record<string, ProgressRow>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/courses/${courseId}?include=structure`);
      const j = (await res.json()) as {
        course?: Record<string, unknown>;
        modules?: ModuleRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải được khóa học");
        return;
      }
      setCourse(j.course ?? null);
      setModules(j.modules ?? []);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const loadEnrollment = useCallback(async () => {
    const res = await fetch("/api/v2/me/enrollments");
    if (!res.ok) return;
    const j = (await res.json()) as { courseIds?: string[] };
    setEnrolled((j.courseIds ?? []).includes(courseId));
  }, [courseId]);

  const loadProgress = useCallback(async () => {
    if (!enrolled) {
      setProgressByLesson({});
      return;
    }
    const res = await fetch(`/api/v2/courses/${courseId}/my-progress`);
    if (!res.ok) return;
    const j = (await res.json()) as {
      byLesson?: Record<string, ProgressRow>;
    };
    setProgressByLesson(j.byLesson ?? {});
  }, [courseId, enrolled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadEnrollment();
  }, [loadEnrollment]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  async function enroll() {
    setEnrolling(true);
    try {
      const res = await fetch(`/api/v2/courses/${courseId}/enroll`, {
        method: "POST",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 409) {
          setEnrolled(true);
          toast.success("Ban da ghi danh");
          return;
        }
        toast.error(j.error ?? "Khong ghi danh duoc");
        return;
      }
      toast.success("Ghi danh thanh cong");
      setEnrolled(true);
    } finally {
      setEnrolling(false);
    }
  }

  if (loading && !course) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground text-sm">Dang tai…</p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-destructive">Khong tim thay khoa hoc V2.</p>
      </main>
    );
  }

  const title = String(course.title ?? "");
  const description = (course.description as string | null) ?? null;
  const thumb = (course.thumbnail_url as string | null) ?? null;
  const totalLessons = Number(course.total_lessons ?? 0);
  const level = (course.level as string | null) ?? null;

  const flatLessons: LessonRow[] = modules.flatMap((m) => m.lessons);
  const firstOpen = flatLessons.find(
    (l) => progressByLesson[l.id]?.status !== "completed"
  );
  const firstHref = firstOpen
    ? `/learn/${firstOpen.id}`
    : flatLessons[0]
      ? `/learn/${flatLessons[0].id}`
      : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton fallbackHref="/student/courses/explore" label="Kham pha" className="mb-6" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
          <div className="relative aspect-video bg-muted">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Edu V2</Badge>
              {level ? <Badge variant="outline">{level}</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {description}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-4 text-sm">
              {totalLessons} bai hoc
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {enrolled && firstHref ? (
                <Link
                  href={firstHref}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "inline-flex items-center gap-2"
                  )}
                >
                  <Play className="h-4 w-4" />
                  Hoc ngay
                </Link>
              ) : null}
              {!enrolled ? (
                <Button size="lg" onClick={() => void enroll()} disabled={enrolling}>
                  {enrolling ? "…" : "Ghi danh (V2)"}
                </Button>
              ) : (
                <Badge variant="outline" className="h-10 px-3 py-2">
                  Da ghi danh
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold">Chuong trinh hoc</h2>
        {modules.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{m.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {m.lessons.length === 0 ? (
                <p className="text-muted-foreground text-sm">Chua co bai hoc.</p>
              ) : (
                <ul className="space-y-2">
                  {m.lessons.map((l) => {
                    const pr = progressByLesson[l.id];
                    const done = pr?.status === "completed";
                    return (
                      <li
                        key={l.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="text-muted-foreground h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate text-sm font-medium">
                            {l.title}
                          </span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {l.lesson_type}
                          </Badge>
                        </div>
                        {enrolled ? (
                          <Link
                            href={`/learn/${l.id}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "shrink-0"
                            )}
                          >
                            Mo bai
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Ghi danh de hoc
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
