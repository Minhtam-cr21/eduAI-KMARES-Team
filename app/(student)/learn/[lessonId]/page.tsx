"use client";

import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type LessonPayload = {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  topic_id: string;
  topic: { title: string };
};

export default function LearnLessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pathId, setPathId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [firstExerciseId, setFirstExerciseId] = useState<string | null>(null);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`);
      const data = (await res.json()) as {
        lesson?: LessonPayload;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? res.statusText);
        setLesson(null);
        return;
      }
      if (!data.lesson) {
        setError("Không có dữ liệu.");
        setLesson(null);
        return;
      }
      setLesson(data.lesson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi mạng");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  const loadPathAndExercises = useCallback(async () => {
    try {
      const [pathsRes, exRes] = await Promise.all([
        fetch("/api/user/learning-paths"),
        fetch(`/api/exercises?lessonId=${encodeURIComponent(lessonId)}`),
      ]);
      const pathsData = await pathsRes.json();
      if (pathsRes.ok && Array.isArray(pathsData)) {
        const row = (
          pathsData as {
            id: string;
            lesson: { id: string };
            status: string;
          }[]
        ).find((p) => p.lesson.id === lessonId);
        if (row) {
          setPathId(row.id);
          setCompleted(row.status === "completed");
        } else {
          setPathId(null);
          setCompleted(false);
        }
      }
      const exJson = (await exRes.json()) as {
        exercises?: { id: string }[];
        error?: string;
      };
      if (exRes.ok && exJson.exercises?.length) {
        setFirstExerciseId(exJson.exercises[0].id);
      } else {
        setFirstExerciseId(null);
      }
    } catch {
      setPathId(null);
      setCompleted(false);
      setFirstExerciseId(null);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  useEffect(() => {
    if (!lesson) return;
    void loadPathAndExercises();
  }, [lesson, loadPathAndExercises]);

  async function markComplete() {
    if (!pathId) {
      toast.error("Không tìm thấy mục lộ trình cho bài này.");
      return;
    }
    try {
      const res = await fetch(`/api/user/learning-paths/${pathId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Không cập nhật được", {
          description: data.error ?? res.statusText,
        });
        return;
      }
      setCompleted(true);
      toast.success("Đã đánh dấu hoàn thành.");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (loading) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground text-center text-sm">Đang tải…</p>
      </article>
    );
  }

  if (error || !lesson) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-destructive text-sm">{error ?? "Không tìm thấy bài học."}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Về dashboard
        </Button>
      </article>
    );
  }

  const content = lesson.content?.trim() ?? "";

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-muted-foreground text-sm">
        <Link href="/dashboard" className="hover:text-foreground underline">
          ← Dashboard
        </Link>
        <span className="mx-2">·</span>
        <span>{lesson.topic.title}</span>
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {lesson.title}
      </h1>

      {lesson.video_url ? (
        <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
          <iframe
            title="Video bài học"
            src={lesson.video_url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <div className="mt-8">
        {content ? (
          <LessonMarkdown content={content} />
        ) : (
          <p className="text-muted-foreground text-sm italic">
            Bài học chưa có nội dung văn bản.
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:items-center">
        {pathId ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id="done-lesson"
              checked={completed}
              disabled={completed}
              onCheckedChange={(v) => {
                if (v === true && !completed) void markComplete();
              }}
            />
            <Label htmlFor="done-lesson" className="cursor-pointer font-normal">
              Đánh dấu hoàn thành
            </Label>
          </div>
        ) : null}

        {firstExerciseId ? (
          <Link
            href={`/debug?exerciseId=${firstExerciseId}`}
            className={cn(buttonVariants())}
          >
            Thực hành
          </Link>
        ) : (
          <p className="text-muted-foreground text-sm">Chưa có bài tập</p>
        )}
      </div>
    </article>
  );
}
