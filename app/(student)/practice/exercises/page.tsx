"use client";

import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen, Code2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CodingLesson = {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  content: string | null;
  code_template: string | null;
  order_index: number;
};

export default function PracticeCourseExercisesPage() {
  const [lessons, setLessons] = useState<CodingLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/practice/coding-lessons");
      const data = (await res.json()) as {
        lessons?: CodingLesson[];
        error?: string;
      };
      if (!res.ok) {
        toast.error("Không tải được bài tập", { description: data.error });
        setLessons([]);
        return;
      }
      setLessons(data.lessons ?? []);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byCourse = useMemo(() => {
    const m = new Map<string, { title: string; items: CodingLesson[] }>();
    for (const l of lessons) {
      const cur = m.get(l.course_id);
      if (cur) {
        cur.items.push(l);
      } else {
        m.set(l.course_id, { title: l.course_title || "Khóa học", items: [l] });
      }
    }
    return Array.from(m.entries());
  }, [lessons]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bài tập theo khóa</h1>
            <p className="text-sm text-muted-foreground">
              Các bài có code trong khóa bạn đã đăng ký.
            </p>
          </div>
        </div>
        <Link
          href="/practice/random"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          <Code2 className="mr-2 h-4 w-4" />
          Luyện random
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : byCourse.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có bài coding nào trong khóa đã đăng ký, hoặc bạn chưa ghi danh khóa nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {byCourse.map(([courseId, group]) => (
            <section key={courseId}>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                {group.title}
              </h2>
              <ul className="space-y-2">
                {group.items.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/practice/lesson/${l.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <span className="font-medium text-foreground">{l.title}</span>
                      <span className="text-xs text-muted-foreground">Mở →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
