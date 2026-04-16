import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { loadStudentEnrolledCourses } from "@/lib/user-courses/enrolled";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
export default async function MyCoursesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loaded = user
    ? await loadStudentEnrolledCourses(supabase, user.id)
    : { data: { courses: [] }, error: null, status: 200 };
  const data = loaded.data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Khóa học của tôi
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Các khóa bạn đã đăng ký và tiến độ bài học.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/courses/explore"
            prefetch
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Khám phá khóa học
          </Link>
          <Link
            href="/student"
            prefetch
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← Hub
          </Link>
        </div>
      </div>

      {!data?.courses?.length ? (
        <p className="text-muted-foreground text-sm">
          Bạn chưa đăng ký khóa nào.{" "}
          <Link
            href="/student/courses/explore"
            prefetch
            className="text-primary underline"
          >
            Khám phá khóa học
          </Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {data.courses.map((item) => {
            const c = item.course;
            const t = item.total_lessons;
            const done = item.completed_lessons;
            return (
              <li
                key={item.enrollment.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-40">
                  {c.thumbnail_url ? (
                    <Image
                      src={c.thumbnail_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 160px"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.title ?? "Khóa học"}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.category} · {c.course_type}
                    {item.teacher?.full_name
                      ? ` · GV: ${item.teacher.full_name}`
                      : null}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Tiến độ: {done}/{t} bài
                  </p>
                </div>
                <Link
                  href={`/student/courses/${c.id}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "shrink-0 self-start sm:self-center"
                  )}
                >
                  Tiếp tục
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
