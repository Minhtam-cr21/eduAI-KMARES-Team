import { StudentDashboardModules } from "@/components/student/student-dashboard-modules";
import { createClient } from "@/lib/supabase/server";
import { loadStudentDashboardSnapshot } from "@/lib/student/dashboard";
import { loadUserProfileSummary } from "@/lib/user/profile";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CalendarClock, Route, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const SUBTITLE =
  "Ch\u1ecdn m\u1ee5c b\u00ean d\u01b0\u1edbi: kh\u00f3a h\u1ecdc, l\u1ed9 tr\u00ecnh, l\u1ecbch h\u1ecdc ho\u1eb7c h\u1ed3 s\u01a1.";
const LINK_MY_COURSES = "M\u1edf kh\u00f3a h\u1ecdc c\u1ee7a t\u00f4i";

export default async function StudentDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await loadUserProfileSummary(supabase, user.id) : null;
  const dashboard = user
    ? await loadStudentDashboardSnapshot(supabase, user.id)
    : null;
  const displayName = profile?.full_name?.trim() || "bạn";
  const avatarUrl = profile?.avatar_url ?? null;
  const weekStatus = dashboard?.data.week_status ?? null;
  const paceAlert = dashboard?.data.pace_alert ?? null;
  const tasksToday = dashboard?.data.tasks_today ?? [];
  const roadmap = dashboard?.data.roadmap_progress;
  const alertToneClass =
    paceAlert?.tone === "critical"
      ? "border-rose-500/30 bg-rose-500/10"
      : paceAlert?.tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10"
        : "border-emerald-500/30 bg-emerald-500/10";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-background bg-muted shadow">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
                {(displayName[0] ?? "U").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Xin chào, {displayName}.{" "}
              <Sparkles className="ml-1 inline h-5 w-5 text-amber-500" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{SUBTITLE}</p>
          </div>
        </div>
        <Link
          href="/student/courses/explore"
          prefetch
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
          )}
        >
          Khám phá khóa học
        </Link>
      </header>

      {paceAlert ? (
        <section className={cn("mb-6 rounded-2xl border p-4", alertToneClass)}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
            <div>
              <p className="font-semibold text-foreground">{paceAlert.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{paceAlert.message}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Task hôm nay</p>
              <p className="text-sm text-muted-foreground">
                Các mục đến hạn trong ngày từ lịch học thông minh.
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          {tasksToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Hôm nay chưa có task đến hạn. Bạn có thể kiểm tra lịch tuần để chủ động học sớm.
            </p>
          ) : (
            <ul className="space-y-3">
              {tasksToday.map((task) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-border/80 bg-background px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.priority}{" "}
                        {task.soft_deadline_level ? `· ${task.soft_deadline_level}` : ""} ·{" "}
                        {task.status}
                      </p>
                    </div>
                    {task.href ? (
                      <Link
                        href={task.href}
                        prefetch
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Học ngay
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{task.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Tình trạng tuần này</p>
            {weekStatus ? (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  {weekStatus.week_start} → {weekStatus.week_end}
                </p>
                <p className="text-sm text-muted-foreground">
                  {weekStatus.total_items} mục · pending {weekStatus.pending_items} · overdue{" "}
                  {weekStatus.overdue_items}
                </p>
                <p className="text-sm text-muted-foreground">
                  slip {weekStatus.slip_count} · risk {weekStatus.risk_level}
                  {weekStatus.high_load_detected ? " · tải cao" : ""}
                  {weekStatus.imbalance_detected ? " · lệch tải" : ""}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có đủ dữ liệu tuần để phân tích.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Tiến độ lộ trình</p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {roadmap?.total_courses ?? 0} khóa trong path gần nhất
                </p>
              </div>
              <Route className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>Active path: {roadmap?.active_paths ?? 0}</p>
              <p>Approved path: {roadmap?.approved_paths ?? 0}</p>
              <p>Trạng thái mới nhất: {roadmap?.status ?? "chưa có"}</p>
              <p>Khóa đã tham gia: {dashboard?.data.enrolled_courses_count ?? 0}</p>
            </div>
            <Link
              href="/personalized-roadmap"
              prefetch
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Xem lộ trình
            </Link>
          </div>
        </div>
      </section>

      <StudentDashboardModules />

      <p className="text-center text-sm text-muted-foreground">
        Cần học tiếp?{" "}
        <Link
          href="/student/courses"
          prefetch
          className="font-medium text-primary hover:underline"
        >
          {LINK_MY_COURSES}
        </Link>
      </p>
    </main>
  );
}
