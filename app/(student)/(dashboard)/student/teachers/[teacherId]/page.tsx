import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseTeacherPublicProfile } from "@/lib/teacher/parse-public-profile";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, User } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { TeacherProfileActions } from "./profile-actions";

type PageProps = { params: { teacherId: string } };

export default async function TeacherPublicPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/student/teachers/${params.teacherId}`);
  }

  const { data, error } = await supabase.rpc("get_teacher_public_profile", {
    p_teacher_id: params.teacherId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const profile = parseTeacherPublicProfile(data);
  if (!profile) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton fallbackHref="/student/teachers" className="mb-4" />

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center sm:justify-start">
          {profile.avatar_url ? (
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-border bg-muted">
              <User className="h-14 w-14 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground">
            {profile.full_name?.trim() || "Giáo viên"}
          </h1>
          {profile.email_masked ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {profile.email_masked}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-sm">
            {profile.total_students} học sinh đã từng gửi yêu cầu kết nối
          </p>
          {profile.skills.length > 0 ? (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {profile.skills.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex justify-center sm:justify-start">
            <TeacherProfileActions
              teacherId={profile.id}
              teacherName={profile.full_name}
            />
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Khóa học đang mở</h2>
        {profile.published_courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa có khóa học được xuất bản.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.published_courses.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex h-36 border-b border-border bg-muted/40">
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex w-full items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {c.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {c.course_type}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  {c.description ? (
                    <CardDescription className="line-clamp-3">
                      {c.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
