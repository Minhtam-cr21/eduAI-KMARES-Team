"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ScheduleItem = {
  id: string;
  due_date: string | null;
  status: string;
  miss_count: number | null;
  completed_at: string | null;
  lesson: {
    id: string;
    title: string;
    course_id: string;
    course: { id: string; title: string } | null;
  } | null;
};

type ProgressJson = {
  progressPercent?: number;
  totalPaths?: number;
  completedPaths?: number;
  learningPaths?: unknown[];
};

type ScheduleJson = {
  items?: ScheduleItem[];
  summary?: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    frozen?: number;
  };
  analysis?: {
    analysis_source: string;
    engine_version?: string;
    as_of_date: string;
    recommendations: string[];
    weekly_analysis?: Array<{
      week_start: string;
      week_end: string;
      slip_count: number;
      risk_level: string;
      high_load_detected: boolean;
      imbalance_detected: boolean;
    }>;
    teacher_recommendations?: Array<{
      recommendation_type: string;
      priority: string;
      rationale: string;
      recommended_action: string;
      target_item_ids: string[];
    }>;
    adjustment_proposals?: Array<{
      item_id: string;
      priority: string;
      soft_deadline_level: string;
      proposed_due_date: string | null;
      proposal_reason: string;
      suggested_action: string;
    }>;
  };
  latestReview?: {
    id: string;
    review_status: string;
    risk_level: string | null;
    action_recommendation: string | null;
    review_note: string | null;
    created_at: string;
  } | null;
  reviewHistory?: Array<{
    id: string;
    review_status: string;
    risk_level: string | null;
    action_recommendation: string | null;
    review_note: string | null;
    created_at: string;
  }>;
  error?: string;
};

const MSG_NO_SCHEDULE =
  "No schedule rows yet from an approved path — check the student accepted a path and study_schedule was generated.";
const MSG_OVERDUE = (n: number) =>
  `${n} overdue items still open — consider shifting deadlines or splitting lessons.`;
const MSG_SLOW =
  "Overall progress is low with many pending schedule items — shorten the course chain or push some due dates.";
const MSG_ON_TRACK =
  "Schedule is on time — keep pace or increase load if the student has more availability.";

function heuristicNotes(params: {
  progressPercent: number;
  schedule: ScheduleJson["summary"];
}): string[] {
  const out: string[] = [];
  const s = params.schedule;
  if (!s || s.total === 0) {
    out.push(MSG_NO_SCHEDULE);
    return out;
  }
  if (s.overdue > 0) {
    out.push(MSG_OVERDUE(s.overdue));
  }
  if (params.progressPercent < 40 && s.completed < s.total * 0.3) {
    out.push(MSG_SLOW);
  }
  if (s.pending > 0 && s.overdue === 0) {
    out.push(MSG_ON_TRACK);
  }
  return out;
}

export function TeacherScheduleInsightsClient({
  initialStudents = [],
}: {
  initialStudents?: TeacherStudentRow[];
}) {
  const [students, setStudents] = useState<TeacherStudentRow[]>(initialStudents);
  const [loadingList, setLoadingList] = useState(initialStudents.length === 0);
  const [studentId, setStudentId] = useState<string>("");
  const [progress, setProgress] = useState<ProgressJson | null>(null);
  const [schedule, setSchedule] = useState<ScheduleJson | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [riskLevel, setRiskLevel] = useState("medium");
  const [scheduleReviewStatus, setScheduleReviewStatus] = useState("monitoring");
  const [actionRecommendation, setActionRecommendation] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [overridePriority, setOverridePriority] = useState("normal");
  const [overridePacing, setOverridePacing] = useState("steady");
  const [overrideLevel, setOverrideLevel] = useState("level_1");

  const loadStudents = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/teacher/students");
      const j = (await res.json()) as {
        students?: TeacherStudentRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Could not load students");
        setStudents([]);
        return;
      }
      setStudents(j.students ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
      setStudents([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (initialStudents.length === 0) {
      void loadStudents();
    }
  }, [initialStudents.length, loadStudents]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setProgress(null);
      setSchedule(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/teacher/students/${id}/progress`),
        fetch(`/api/teacher/students/${id}/schedule`),
      ]);
      const pJson = (await pRes.json()) as ProgressJson & { error?: string };
      const sJson = (await sRes.json()) as ScheduleJson;

      if (!pRes.ok) {
        toast.error(pJson.error ?? "Could not load progress");
        setProgress(null);
      } else {
        setProgress(pJson);
      }
      if (!sRes.ok) {
        toast.error(sJson.error ?? "Could not load schedule");
        setSchedule(null);
      } else {
        setSchedule(sJson);
        setRiskLevel(sJson.latestReview?.risk_level ?? "medium");
        setScheduleReviewStatus(sJson.latestReview?.review_status ?? "monitoring");
        setActionRecommendation(sJson.latestReview?.action_recommendation ?? "");
        setReviewNote(sJson.latestReview?.review_note ?? "");
        setOverridePriority(
          sJson.analysis?.adjustment_proposals?.[0]?.priority ?? "normal"
        );
        setOverrideLevel(
          sJson.analysis?.adjustment_proposals?.[0]?.soft_deadline_level ?? "level_1"
        );
        setOverridePacing("steady");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
      setProgress(null);
      setSchedule(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) void loadDetail(studentId);
  }, [studentId, loadDetail]);

  const progressPercent = progress?.progressPercent ?? 0;
  const notes = useMemo(
    () =>
      heuristicNotes({
        progressPercent,
        schedule: schedule?.summary,
      }),
    [progressPercent, schedule?.summary]
  );

  async function saveScheduleReview() {
    if (!studentId) return;
    setSavingReview(true);
    try {
      const res = await fetch(`/api/teacher/students/${studentId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus: scheduleReviewStatus,
          riskLevel,
          actionRecommendation,
          reviewNote,
          targetItemId: schedule?.analysis?.adjustment_proposals?.[0]?.item_id,
          overridePriority,
          overridePacing,
          overrideLevel,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not save schedule review");
        return;
      }
      toast.success("Đã lưu schedule review.");
      await loadDetail(studentId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Network error");
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chọn học sinh</CardTitle>
          <CardDescription>
            Dùng màn này để đọc lịch học và lưu intervention review nhanh. Nếu cần quyết
            định tổng thể hơn, mở student workspace của học sinh tương ứng.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {loadingList ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <div className="min-w-[220px] flex-1">
              <Select
                value={studentId || undefined}
                onValueChange={(value) => {
                  startTransition(() => {
                    setStudentId(value);
                  });
                }}
              >
                <SelectTrigger aria-label="Student">
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name ?? s.email ?? s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => void loadStudents()}
          >
            Refresh list
          </button>
        </CardContent>
      </Card>

      {!studentId ? (
        <p className="text-muted-foreground text-sm">
          Pick a student to load learning_paths progress and study_schedule.
        </p>
      ) : loadingDetail ? (
        <p className="text-muted-foreground text-sm">Loading detail…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress (learning_paths)</CardTitle>
              <CardDescription>
                Completion ratio across assigned topic / lesson items.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Done: </span>
                <span className="font-semibold tabular-nums">{progressPercent}%</span>
              </p>
              <p className="text-muted-foreground">
                {progress?.completedPaths ?? 0} / {progress?.totalPaths ?? 0} items
              </p>
              <Link
                href={`/teacher/personalized-paths/${studentId}`}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "mt-2 inline-flex"
                )}
              >
                Edit personalized path
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule (study_schedule)</CardTitle>
              <CardDescription>
                Status by due date; miss_count counts missed deadlines when tracked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {schedule?.summary ? (
                <>
                  <p>
                    Total {schedule.summary.total} · Pending {schedule.summary.pending} · Done{" "}
                    {schedule.summary.completed} · Overdue {schedule.summary.overdue}
                    {typeof schedule.summary.frozen === "number"
                      ? ` · Frozen ${schedule.summary.frozen}`
                      : ""}
                  </p>
                  {schedule.analysis?.recommendations?.length ? (
                    <ul className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                      {schedule.analysis.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {schedule.analysis?.teacher_recommendations?.length ? (
                    <ul className="space-y-2 rounded-md border border-border/70 px-3 py-2 text-xs">
                      {schedule.analysis.teacher_recommendations.map((item) => (
                        <li key={`${item.recommendation_type}-${item.rationale}`}>
                          <span className="font-medium">
                            {item.recommendation_type} · {item.priority}
                          </span>
                          <span className="text-muted-foreground"> — {item.rationale}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <ul className="max-h-48 overflow-y-auto border-t border-border pt-2 text-xs">
                    {(schedule.items ?? []).slice(0, 12).map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-wrap justify-between gap-1 border-b border-border/60 py-1 last:border-0"
                      >
                        <span className="min-w-0 truncate">
                          {it.lesson?.course?.title ?? "—"} — {it.lesson?.title ?? it.id}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {it.due_date
                            ? new Date(it.due_date).toLocaleDateString("vi-VN")
                            : "—"}{" "}
                          · {it.status}
                          {(it.miss_count ?? 0) > 0 ? ` · miss ${it.miss_count}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-muted-foreground">No schedule data.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Review workflow</CardTitle>
              <CardDescription>
                Persist review ngắn cho snapshot lịch học hiện tại mà không copy toàn bộ
                `study_schedule` items.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Risk level</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Review status</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={scheduleReviewStatus}
                    onChange={(e) => setScheduleReviewStatus(e.target.value)}
                  >
                    <option value="monitoring">Monitoring</option>
                    <option value="needs_follow_up">Needs follow up</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Override priority
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={overridePriority}
                    onChange={(e) => setOverridePriority(e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="light">Light</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Override pacing
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={overridePacing}
                    onChange={(e) => setOverridePacing(e.target.value)}
                  >
                    <option value="slow">Slow</option>
                    <option value="steady">Steady</option>
                    <option value="accelerated">Accelerated</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Override level
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={overrideLevel}
                    onChange={(e) => setOverrideLevel(e.target.value)}
                  >
                    <option value="level_1">Level 1</option>
                    <option value="level_2">Level 2</option>
                    <option value="level_3">Level 3</option>
                    <option value="level_4">Level 4</option>
                  </select>
                </label>
              </div>
              {schedule?.analysis?.adjustment_proposals?.length ? (
                <ul className="space-y-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  {schedule.analysis.adjustment_proposals.slice(0, 3).map((proposal) => (
                    <li key={proposal.item_id}>
                      {proposal.soft_deadline_level} · {proposal.priority}
                      {proposal.proposed_due_date ? ` · due ${proposal.proposed_due_date}` : ""}
                      {" — "}
                      {proposal.suggested_action}
                    </li>
                  ))}
                </ul>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Action recommendation</span>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={actionRecommendation}
                  onChange={(e) => setActionRecommendation(e.target.value)}
                  placeholder="Ví dụ: giảm tải tuần tới, nhắn học sinh xác nhận giờ học."
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Review note</span>
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Ví dụ: overdue tăng do path vừa active, theo dõi thêm 1 tuần."
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={studentId ? `/teacher/students/${studentId}` : "/teacher/students"}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Mở student workspace
                </Link>
                <button
                  type="button"
                  disabled={savingReview || !studentId}
                  className={cn(buttonVariants())}
                  onClick={() => void saveScheduleReview()}
                >
                  Lưu review
                </button>
                {schedule?.latestReview ? (
                  <span className="text-xs text-muted-foreground">
                    Review gần nhất: {schedule.latestReview.review_status} ·{" "}
                    {new Date(schedule.latestReview.created_at).toLocaleString("vi-VN")}
                  </span>
                ) : null}
              </div>
              {schedule?.reviewHistory?.length ? (
                <ul className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  {schedule.reviewHistory.slice(0, 3).map((review) => (
                    <li key={review.id} className="rounded-md border border-dashed border-border px-3 py-2">
                      <div>
                        {review.review_status} · risk {review.risk_level ?? "—"} ·{" "}
                        {new Date(review.created_at).toLocaleString("vi-VN")}
                      </div>
                      {review.action_recommendation ? (
                        <div>Action: {review.action_recommendation}</div>
                      ) : null}
                      {review.review_note ? <div>Note: {review.review_note}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
