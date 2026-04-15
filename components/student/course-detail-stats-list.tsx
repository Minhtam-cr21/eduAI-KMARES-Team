import type { ComponentType } from "react";
import { Award, ClipboardList, Clock, FileText, Infinity, ListChecks, Video } from "lucide-react";

export type LessonCounts = {
  video: number;
  textRead: number;
  quiz: number;
  total: number;
  totalMinutes: number;
};

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {label}
      </span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function CourseDetailStatsList({
  durationHours,
  counts,
}: {
  durationHours: number | null;
  counts: LessonCounts;
}) {
  const fromLessonsH =
    counts.totalMinutes > 0
      ? Math.round((counts.totalMinutes / 60) * 10) / 10
      : null;
  const hoursDisplay =
    fromLessonsH != null
      ? `${fromLessonsH} h (\u01B0\u1EDBc t\u00EDnh t\u1EEB b\u00E0i)`
      : durationHours != null
        ? `${durationHours} h`
        : "\u2014";

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-1">
      <Row icon={Clock} label="Th\u1EDDi l\u01B0\u1EE3ng" value={hoursDisplay} />
      <Row icon={Video} label="Video" value={counts.video} />
      <Row icon={FileText} label="B\u00E0i \u0111\u1ECDc" value={counts.textRead} />
      <Row icon={ListChecks} label="B\u00E0i t\u1EADp / th\u1EF1c h\u00E0nh" value="\u2014" />
      <Row icon={ClipboardList} label="B\u00E0i ki\u1EC3m tra" value={counts.quiz} />
      <Row icon={Infinity} label="Truy c\u1EADp" value="Tr\u1ECDn \u0111\u1EDDi" />
      <Row icon={Award} label="Ch\u1EE9ng ch\u1EC9" value="Khi ho\u00E0n th\u00E0nh" />
    </div>
  );
}
