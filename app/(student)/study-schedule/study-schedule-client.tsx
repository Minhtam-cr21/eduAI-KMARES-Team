"use client";

import {
  StudyCalendar,
  type StudyCalendarItem,
} from "@/components/calendar/study-calendar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ScheduleAdjustmentProposal,
  ScheduleAnalysisSnapshot,
  ScheduleSummary,
  TeacherScheduleRecommendation,
  WeeklyLearningAnalysis,
} from "@/lib/study-schedule/contracts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function StudyScheduleClient({
  initialItems,
  initialSummary,
  initialAnalysis,
}: {
  initialItems: StudyCalendarItem[];
  initialSummary: ScheduleSummary | null;
  initialAnalysis: ScheduleAnalysisSnapshot | null;
}) {
  const [items, setItems] = useState<StudyCalendarItem[]>(initialItems);
  const [summary, setSummary] = useState<ScheduleSummary | null>(initialSummary);
  const [analysis, setAnalysis] =
    useState<ScheduleAnalysisSnapshot | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/study-schedule");
      const j = (await res.json()) as {
        items?: StudyCalendarItem[];
        summary?: ScheduleSummary;
        analysis?: ScheduleAnalysisSnapshot;
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải lịch");
        return;
      }
      setItems(j.items ?? []);
      setSummary(j.summary ?? null);
      setAnalysis(j.analysis ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function markDone(id: string) {
    const res = await fetch(`/api/study-schedule/${id}/complete`, {
      method: "POST",
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error ?? "Không cập nhật được");
      return;
    }
    toast.success("Đã đánh dấu hoàn thành.");
    void load();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Lịch học thông minh</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/personalized-roadmap"
            prefetch
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            Lộ trình
          </Link>
          <Link
            href="/student"
            prefetch
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Trang học sinh
          </Link>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tóm tắt lịch học</CardTitle>
          <CardDescription>
            Snapshot Smart Schedule V2 từ `study_schedule`, gồm risk theo tuần,
            priority và soft-deadline policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang làm mới…</p>
          ) : summary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-muted-foreground">Tổng mục</div>
                  <div className="mt-1 text-xl font-semibold">{summary.total}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-muted-foreground">Đang chờ</div>
                  <div className="mt-1 text-xl font-semibold">{summary.pending}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-muted-foreground">Hoàn thành</div>
                  <div className="mt-1 text-xl font-semibold">{summary.completed}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-muted-foreground">Quá hạn / frozen</div>
                  <div className="mt-1 text-xl font-semibold">
                    {summary.overdue} / {summary.frozen}
                  </div>
                </div>
              </div>
              {analysis?.recommendations?.length ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {analysis.recommendations.map((note) => (
                    <li
                      key={note}
                      className="rounded-md border border-dashed border-border px-3 py-2"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}
              {analysis?.teacher_recommendations?.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {analysis.teacher_recommendations
                    .slice(0, 2)
                    .map((item: TeacherScheduleRecommendation) => (
                      <div
                        key={`${item.recommendation_type}-${item.rationale}`}
                        className="rounded-lg border border-border p-3 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          {item.recommendation_type} · {item.priority}
                        </p>
                        <p className="mt-1 text-muted-foreground">{item.rationale}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.recommended_action}
                        </p>
                      </div>
                    ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu phân tích.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Danh sách theo hạn</CardTitle>
          <CardDescription>
            Hiển thị priority, soft deadline level và lý do đổi lịch khi policy đã
            can thiệp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có mục lịch. Khi bạn đồng ý lộ trình cá nhân hóa, lịch sẽ xuất
              hiện tại đây.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => {
                const href =
                  it.lesson?.course_id && it.lesson?.id
                    ? `/student/courses/${it.lesson.course_id}/lessons/${it.lesson.id}`
                    : null;
                return (
                  <li
                    key={it.id}
                    className="rounded-lg border border-border px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-medium">
                          {it.lesson?.title ?? "Bài học"}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {it.due_date} · {it.status}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-border px-2 py-1">
                            priority {it.priority ?? "normal"}
                          </span>
                          <span className="rounded-full border border-border px-2 py-1">
                            {it.soft_deadline_level ?? "no soft deadline"}
                          </span>
                          {(it.miss_count ?? 0) > 0 ? (
                            <span className="rounded-full border border-border px-2 py-1">
                              trượt {it.miss_count}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {it.adjustment_proposal?.proposal_reason ??
                            "Lịch hiện chưa cần điều chỉnh bởi policy."}
                        </p>
                        {it.adjustment_proposal?.suggested_action ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Gợi ý: {it.adjustment_proposal.suggested_action}
                            {it.adjustment_proposal.proposed_due_date
                              ? ` · due mới ${it.adjustment_proposal.proposed_due_date}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {href ? (
                          <Link
                            href={href}
                            prefetch
                            className={cn(
                              buttonVariants({ variant: "secondary", size: "sm" }),
                              "inline-flex"
                            )}
                          >
                            Học
                          </Link>
                        ) : null}
                        {it.status === "pending" ? (
                          <button
                            type="button"
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" })
                            )}
                            onClick={() => void markDone(it.id)}
                          >
                            Xong
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch tháng</CardTitle>
          <CardDescription>
            Màu theo trạng thái: chờ, hoàn thành, trượt, đóng băng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudyCalendar items={items} />
          {analysis?.weekly_load?.length ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <p className="font-medium">Tải học tập theo tuần gần đây</p>
              <ul className="space-y-1 text-muted-foreground">
                {analysis.weekly_load.slice(-4).map((bucket) => (
                  <li key={bucket.week_start}>
                    {bucket.week_start} → {bucket.week_end}: {bucket.total_items} mục
                    {" · "}pending {bucket.pending_items}
                    {" · "}done {bucket.completed_items}
                    {" · "}overdue {bucket.overdue_items}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis?.weekly_analysis?.length ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <p className="font-medium">Risk và lệch tải theo tuần</p>
              <ul className="space-y-2 text-muted-foreground">
                {analysis.weekly_analysis
                  .slice(-4)
                  .map((week: WeeklyLearningAnalysis) => (
                    <li
                      key={`${week.week_start}-${week.week_end}`}
                      className="rounded-md border border-dashed border-border px-3 py-2"
                    >
                      {week.week_start} → {week.week_end}: risk {week.risk_level}
                      {" · "}slip {week.slip_count}
                      {week.high_load_detected ? " · tải cao" : ""}
                      {week.imbalance_detected ? " · lệch tải" : ""}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {analysis?.adjustment_proposals?.length ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <p className="font-medium">Vì sao lịch thay đổi</p>
              <ul className="space-y-2 text-muted-foreground">
                {analysis.adjustment_proposals
                  .slice(0, 4)
                  .map((proposal: ScheduleAdjustmentProposal) => (
                    <li
                      key={proposal.item_id}
                      className="rounded-md border border-dashed border-border px-3 py-2"
                    >
                      {proposal.soft_deadline_level} · {proposal.priority}
                      {" — "}
                      {proposal.proposal_reason}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
