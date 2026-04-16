"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";

export type StudyCalendarItem = {
  id: string;
  due_date: string | null;
  status: string;
  miss_count?: number | null;
  priority?: "critical" | "high" | "normal" | "light";
  soft_deadline_level?: "level_1" | "level_2" | "level_3" | "level_4" | null;
  adjustment_proposal?: {
    proposal_reason: string;
    suggested_action: string;
    proposed_due_date: string | null;
  } | null;
  lesson: {
    id: string;
    title: string;
    course_id: string;
    course: { id: string; title: string } | null;
  } | null;
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/25 text-amber-900 dark:text-amber-100 border-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-emerald-500/35",
  missed: "bg-red-500/20 text-red-900 dark:text-red-100 border-red-500/35",
  frozen: "bg-slate-500/20 text-slate-900 dark:text-slate-100 border-slate-500/35",
};

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function startWeekday(y: number, m: number) {
  return new Date(y, m - 1, 1).getDay();
}

export function StudyCalendar({ items }: { items: StudyCalendarItem[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, StudyCalendarItem[]>();
    for (const it of items) {
      const d = it.due_date?.slice(0, 10);
      if (!d) continue;
      const list = m.get(d) ?? [];
      list.push(it);
      m.set(d, list);
    }
    return m;
  }, [items]);

  const dim = daysInMonth(year, month);
  const lead = startWeekday(year, month);
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const selectedKey = selected ?? `${year}-${pad(month)}-${pad(now.getDate())}`;
  const selectedItems = byDate.get(selectedKey) ?? [];

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelected(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => shiftMonth(-1)}
          >
            ←
          </button>
          <span className="text-sm font-semibold">
            Tháng {month}/{year}
          </span>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => shiftMonth(1)}
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} className="min-h-10" />;
            }
            const key = `${year}-${pad(month)}-${pad(day)}`;
            const list = byDate.get(key) ?? [];
            const has = list.length > 0;
            const isSel = selected ? key === selected : false;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "relative min-h-10 rounded-md border text-sm transition-colors",
                  has
                    ? "border-primary/50 bg-primary/10 font-medium text-foreground"
                    : "border-transparent hover:bg-muted/60",
                  isSel && "ring-2 ring-ring"
                )}
              >
                {day}
                {has ? (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Ngày {selectedKey}</h2>
        <ul className="mt-3 space-y-2">
          {selectedItems.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Không có bài học trong ngày này.
            </li>
          ) : (
            selectedItems.map((it) => {
              const st = it.status ?? "pending";
              const badge =
                STATUS_CLASS[st] ??
                "bg-muted text-foreground border-border";
              const href =
                it.lesson?.course_id && it.lesson?.id
                  ? `/student/courses/${it.lesson.course_id}/lessons/${it.lesson.id}`
                  : null;
              return (
                <li
                  key={it.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    badge
                  )}
                >
                  <div className="font-medium">
                    {it.lesson?.title ?? "Bài học"}
                  </div>
                  <div className="text-xs opacity-80">
                    {it.lesson?.course?.title ?? "Khóa học"} · {st}
                    {it.miss_count ? ` · trượt ${it.miss_count}` : ""}
                    {it.priority ? ` · ${it.priority}` : ""}
                    {it.soft_deadline_level ? ` · ${it.soft_deadline_level}` : ""}
                  </div>
                  {it.adjustment_proposal ? (
                    <div className="mt-1 text-xs opacity-80">
                      {it.adjustment_proposal.proposal_reason}
                    </div>
                  ) : null}
                  {href ? (
                    <Link
                      href={href}
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "sm" }),
                        "mt-2 inline-flex"
                      )}
                    >
                      Học
                    </Link>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
