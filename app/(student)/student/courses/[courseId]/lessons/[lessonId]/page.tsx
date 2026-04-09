"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function StudentCourseLessonPage() {
  const params = useParams();
  const courseId =
    typeof params.courseId === "string" ? params.courseId : "";
  const lessonId =
    typeof params.lessonId === "string" ? params.lessonId : "";
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId || !lessonId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/user/courses/${courseId}/lessons/${lessonId}`
        );
        const j = (await res.json()) as {
          lesson?: { title: string; content: string | null };
          error?: string;
        };
        if (!res.ok) {
          toast.error(j.error ?? "Không tải bài học");
          return;
        }
        if (!cancelled && j.lesson) {
          setTitle(j.lesson.title);
          setContent(j.lesson.content ?? "");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/student/courses/${courseId}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-4 -ml-2"
        )}
      >
        ← Về khóa học
      </Link>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {content ? (
          <LessonMarkdown content={content} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Bài học chưa có nội dung markdown.
          </p>
        )}
      </div>
    </main>
  );
}
