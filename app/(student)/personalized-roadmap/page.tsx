import { PersonalizedRoadmapClient } from "@/components/student/personalized-roadmap-client";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PersonalizedRoadmapPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/personalized-roadmap");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("assessment_completed, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const done = profile?.assessment_completed === true;

  if (!done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Lộ trình cá nhân hóa</CardTitle>
            <CardDescription>
              Hoàn thành trắc nghiệm định hướng để mở tính năng này.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Kết quả test giúp giáo viên đề xuất thứ tự khóa học và lịch học
              phù hợp với bạn.
            </p>
            <Link
              href="/assessment"
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex"
              )}
            >
              Làm bài test ngay
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data: paths } = await supabase
    .from("personalized_paths")
    .select(
      "id, status, course_sequence, student_feedback, teacher_feedback, updated_at"
    )
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  const { data: courseList } = await supabase
    .from("courses")
    .select("id, title, category")
    .eq("status", "published");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Lộ trình cá nhân hóa</CardTitle>
          <CardDescription>
            Xin chào{profile?.full_name ? `, ${profile.full_name}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <PersonalizedRoadmapClient
            paths={paths ?? []}
            courseList={courseList ?? []}
          />
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href="/study-schedule"
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
            >
              Lịch học
            </Link>
            <Link
              href="/student"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              Về Dashboard
            </Link>
            <Link
              href="/assessment/result"
              className={cn(buttonVariants({ variant: "ghost" }), "inline-flex")}
            >
              Kết quả test
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
