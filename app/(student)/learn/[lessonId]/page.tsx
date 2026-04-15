import { LessonQuizSection } from "@/components/student/lesson-quiz-section";
import { LessonCompleteActions } from "@/components/student/lesson-complete-actions";
import {
  LessonActivityPing,
  LessonScheduleCompleteSection,
} from "@/components/student/lesson-learn-client";
import { LessonMarkdown } from "@/components/student/lesson-markdown";
import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed-url";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LearnCourseLessonPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const { lessonId } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/learn/${lessonId}`)}`);
  }

  const { data: lesson, error: lErr } = await supabase
    .from("course_lessons")
    .select(
      "id, title, content, video_url, code_template, course_id, status, type, time_estimate"
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (lErr || !lesson) {
    notFound();
  }

  if (lesson.status !== "published") {
    notFound();
  }

  const { data: course } = await supabase
    .from("courses")
    .select("title, category")
    .eq("id", lesson.course_id as string)
    .maybeSingle();

  const { data: enroll } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", lesson.course_id as string)
    .maybeSingle();

  if (!enroll) {
    return (
      <>
        <LessonActivityPing />
        <article className="mx-auto max-w-3xl px-4 py-8">
          <BackButton fallbackHref="/student/courses/explore" className="mb-4" />
          <h1 className="text-xl font-semibold text-foreground">Chưa ghi danh</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Bạn cần đăng ký khóa học này để xem bài học.
          </p>
          <Link
            href="/student/courses/explore"
            className={cn(buttonVariants(), "mt-6 inline-flex")}
          >
            Khám phá khóa học
          </Link>
        </article>
      </>
    );
  }

  const { data: progRow } = await supabase
    .from("user_course_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("course_id", lesson.course_id as string)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const lessonCompleted = progRow?.status === "completed";

  const videoSrc = normalizeVideoEmbedUrl(lesson.video_url as string | null);
  const content = (lesson.content as string | null)?.trim() ?? "";

  return (
    <>
      <LessonActivityPing />
      <article className="mx-auto max-w-3xl px-4 py-8">
        <BackButton fallbackHref="/study-schedule" className="mb-4" />

        <p className="text-muted-foreground text-sm">
          {course?.title ? <span>{String(course.title)}</span> : null}
          {course?.category ? (
            <span className="text-muted-foreground/80">
              {course?.title ? " · " : null}
              {String(course.category)}
            </span>
          ) : null}
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {lesson.title as string}
        </h1>

        {videoSrc ? (
          <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
            <iframe
              title="Video bài học"
              src={videoSrc}
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

        <LessonQuizSection
          courseId={String(lesson.course_id)}
          lessonId={lessonId}
          enrolled={!!enroll}
        />

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:items-center">
          <LessonCompleteActions
            courseId={String(lesson.course_id)}
            lessonId={lessonId}
            lessonType={(lesson.type as string | null) ?? "text"}
            hasVideo={!!videoSrc}
            initialCompleted={lessonCompleted === true}
          />
          <LessonScheduleCompleteSection lessonId={lessonId} />

          <Link
            href={`/student/courses/${String(lesson.course_id)}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex"
            )}
          >
            Về khóa học
          </Link>
        </div>
      </article>
    </>
  );
}
