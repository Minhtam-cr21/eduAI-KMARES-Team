import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { requireTeacherOrAdmin } from "@/lib/auth/require-teacher-or-admin";
import { loadTeacherStudentWorkspaceData } from "@/lib/teacher/student-workspace";
import { cn } from "@/lib/utils";
import { AlertTriangle, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: { studentId: string };
}) {
  const gate = await requireTeacherOrAdmin(`/teacher/students/${params.studentId}`);

  const { data, error, status } = await loadTeacherStudentWorkspaceData({
    supabase: gate.supabase,
    teacherId: gate.user.id,
    studentId: params.studentId,
    isAdmin: gate.profile.role === "admin",
  });

  if (!data || error) {
    if (status === 404) {
      notFound();
    }
    return (
      <div className="space-y-4">
        <Link
          href="/teacher/students"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto px-0")}
        >
          ← Danh sách học sinh
        </Link>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{error ?? "Không có dữ liệu"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/students"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto px-0")}
      >
        ← Danh sách học sinh
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-lg font-bold text-white">
          {(data.student.full_name ?? "H")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {data.student.full_name ?? "Học sinh"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Mục tiêu: {data.student.goal ?? "—"} · Giờ/ngày:{" "}
            {data.student.hours_per_day ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assessment summary</CardTitle>
            <CardDescription>
              Structured assessment hiện có, dùng làm đầu vào cho path và schedule intervention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.assessment.teacher_view ? (
              <>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="font-medium text-foreground">
                    {data.assessment.teacher_view.headline}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {data.assessment.teacher_view.summary}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Readiness band</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {data.assessment.teacher_view.readiness_band}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {data.assessment.teacher_view.pacing_guidance}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Primary risks</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                      {data.assessment.teacher_view.primary_risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                Chưa có assessment summary khả dụng cho học sinh này.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tiến độ</CardTitle>
            <CardDescription>
              {data.progress.completed_paths} / {data.progress.total_paths} bài hoàn thành
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Progress value={data.progress.progress_percent} className="h-3 flex-1" />
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {data.progress.progress_percent}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Action panel</CardTitle>
            <CardDescription>
              Các bước can thiệp chính cho học sinh này.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href={`/teacher/personalized-paths/${params.studentId}`}
              className={buttonVariants({ size: "sm" })}
            >
              Mở path suggestion
            </Link>
            <Link
              href={`/teacher/schedule-insights`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Mở lịch học & can thiệp
            </Link>
            <Link
              href="/teacher/notifications"
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              Xem thông báo liên quan
            </Link>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="path" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="path">Path suggestion</TabsTrigger>
          <TabsTrigger value="schedule">Weekly schedule analysis</TabsTrigger>
          <TabsTrigger value="history">Review history</TabsTrigger>
        </TabsList>

        <TabsContent value="path" className="mt-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Route className="h-4 w-4" />
                Path suggestion & current path
              </CardTitle>
              <CardDescription>
                Gộp đề xuất khóa học, trạng thái path hiện tại và review path gần nhất vào cùng luồng.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium text-foreground">Current path</p>
                  {data.personalized_path?.path ? (
                    <div className="mt-2 space-y-2 text-muted-foreground">
                      <p>Trạng thái: {data.personalized_path.path.status}</p>
                      <p>
                        Số khóa:{" "}
                        {Array.isArray(data.personalized_path.path.course_sequence)
                          ? data.personalized_path.path.course_sequence.length
                          : 0}
                      </p>
                      {data.personalized_path.pathReview ? (
                        <p>
                          Review gần nhất: {data.personalized_path.pathReview.review_status}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-muted-foreground">
                      Chưa có path hiện tại.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium text-foreground">AI / rule-based suggestion</p>
                  {data.personalized_path?.suggested ? (
                    <div className="mt-2 space-y-2 text-muted-foreground">
                      <p>{data.personalized_path.suggested.reasoning}</p>
                      <p>
                        {data.personalized_path.suggested.courseSequence.length} course suggestion
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-muted-foreground">
                      Đề xuất hiện đang nằm trong current path hoặc chưa có dữ liệu mới.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                Weekly schedule analysis
              </CardTitle>
              <CardDescription>
                Lịch học, recommendation và action recommendation cho cùng học sinh này.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium text-foreground">Schedule snapshot</p>
                  <p className="mt-2 text-muted-foreground">
                    Total {data.schedule.summary.total} · Pending {data.schedule.summary.pending} ·
                    Overdue {data.schedule.summary.overdue} · Frozen {data.schedule.summary.frozen}
                  </p>
                  {data.schedule.analysis.weekly_analysis.slice(-3).map((week) => (
                    <div
                      key={`${week.week_start}-${week.week_end}`}
                      className="mt-2 rounded-md border border-dashed border-border px-3 py-2 text-muted-foreground"
                    >
                      {week.week_start} → {week.week_end} · risk {week.risk_level} · slip{" "}
                      {week.slip_count}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium text-foreground">Recommendations</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                    {data.schedule.analysis.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {data.schedule.analysis.teacher_recommendations.length ? (
                    <div className="mt-3 space-y-2">
                      {data.schedule.analysis.teacher_recommendations
                        .slice(0, 2)
                        .map((item) => (
                          <div
                            key={`${item.recommendation_type}-${item.rationale}`}
                            className="rounded-md border border-border px-3 py-2 text-muted-foreground"
                          >
                            <p className="font-medium text-foreground">
                              {item.recommendation_type} · {item.priority}
                            </p>
                            <p className="mt-1">{item.recommended_action}</p>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {data.schedule.analysis.adjustment_proposals.length ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Intervention cues
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {data.schedule.analysis.adjustment_proposals.slice(0, 3).map((proposal) => (
                      <li key={proposal.item_id}>
                        {proposal.soft_deadline_level} · {proposal.priority} —{" "}
                        {proposal.suggested_action}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Path review history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.path_review_history.length === 0 ? (
                  <p className="text-muted-foreground">Chưa có path review history.</p>
                ) : (
                  data.path_review_history.map((review) => (
                    <div key={review.id} className="rounded-md border border-dashed border-border p-3">
                      <p className="font-medium text-foreground">{review.review_status}</p>
                      <p className="mt-1 text-muted-foreground">
                        {new Date(review.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Schedule review history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.schedule_review_history.length === 0 ? (
                  <p className="text-muted-foreground">Chưa có schedule review history.</p>
                ) : (
                  data.schedule_review_history.map((review) => (
                    <div key={review.id} className="rounded-md border border-dashed border-border p-3">
                      <p className="font-medium text-foreground">
                        {review.review_status} · risk {review.risk_level ?? "—"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {new Date(review.created_at).toLocaleString("vi-VN")}
                      </p>
                      {review.action_recommendation ? (
                        <p className="mt-1 text-muted-foreground">
                          {review.action_recommendation}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
