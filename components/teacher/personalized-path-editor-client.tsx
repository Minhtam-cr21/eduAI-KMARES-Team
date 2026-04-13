"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CourseOpt = { id: string; title: string; category: string };

type SeqRow = {
  course_id: string;
  order_index: number;
  due_date_offset_days: number;
};

function SortableRow({
  row,
  title,
  locked,
  onOffset,
  onRemove,
}: {
  row: SeqRow;
  title: string;
  locked: boolean;
  onOffset: (days: number) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.course_id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3",
        isDragging && "opacity-70"
      )}
    >
      <button
        type="button"
        className={cn(
          "touch-none text-muted-foreground",
          locked ? "cursor-not-allowed opacity-40" : "cursor-grab"
        )}
        disabled={locked}
        {...attributes}
        {...(!locked ? listeners : {})}
      >
        ⋮⋮
      </button>
      <span className="min-w-0 flex-1 text-sm font-medium">{title}</span>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        Hạn tích luỹ (ngày)
        <Input
          type="number"
          min={1}
          disabled={locked}
          className="h-8 w-20"
          value={row.due_date_offset_days}
          onChange={(e) => onOffset(Number(e.target.value))}
        />
      </label>
      <button
        type="button"
        disabled={locked}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        onClick={onRemove}
      >
        Xóa
      </button>
    </div>
  );
}

export function PersonalizedPathEditorClient({
  studentId,
}: {
  studentId: string;
}) {
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [pathId, setPathId] = useState<string | null>(null);
  const [pathStatus, setPathStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<SeqRow[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addCourseId, setAddCourseId] = useState("");
  const [studentFeedback, setStudentFeedback] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/personalized-path/teacher/by-student/${studentId}`
      );
      const j = (await res.json()) as {
        path?: {
          id: string;
          course_sequence: unknown;
          status: string;
          student_feedback: string | null;
        } | null;
        suggested?: {
          courseSequence: Array<{
            course_id: string;
            order_index: number;
            recommended_due_date_offset_days: number;
          }>;
          reasoning: string;
        };
        courses?: CourseOpt[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải được");
        return;
      }
      setCourses(j.courses ?? []);
      setReasoning(j.suggested?.reasoning ?? null);

      if (j.path) {
        setPathId(j.path.id);
        setPathStatus(j.path.status);
        setStudentFeedback(j.path.student_feedback ?? null);
        const raw = j.path.course_sequence;
        if (Array.isArray(raw)) {
          const parsed = (raw as Record<string, unknown>[])
            .map((r, i) => ({
              course_id: String(r.course_id ?? ""),
              order_index: Number(r.order_index ?? i),
              due_date_offset_days: Number(
                r.due_date_offset_days ??
                  r.recommended_due_date_offset_days ??
                  7 * (i + 1)
              ),
            }))
            .filter((r) => r.course_id);
          parsed.sort((a, b) => a.order_index - b.order_index);
          setRows(parsed.map((r, i) => ({ ...r, order_index: i })));
        } else {
          setRows([]);
        }
      } else if (j.suggested?.courseSequence) {
        setPathId(null);
        setPathStatus(null);
        setStudentFeedback(null);
        setRows(
          j.suggested.courseSequence.map((r, i) => ({
            course_id: r.course_id,
            order_index: i,
            due_date_offset_days:
              r.recommended_due_date_offset_days ?? 7 * (i + 1),
          }))
        );
      } else {
        setRows([]);
        setPathId(null);
        setPathStatus(null);
        setStudentFeedback(null);
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  function titleFor(id: string) {
    const c = courses.find((x) => x.id === id);
    return c ? `${c.title} (${c.category})` : id;
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.course_id === active.id);
    const newIndex = rows.findIndex((r) => r.course_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(rows, oldIndex, newIndex).map((r, i) => ({
      ...r,
      order_index: i,
    }));
    setRows(next);
  }

  async function save(status: "draft" | "pending_student_approval") {
    if (pathStatus === "active") {
      toast.error("Lộ trình đang active — chỉnh khi học sinh góp ý.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Thêm ít nhất một khóa học.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/personalized-path/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          status,
          courseSequence: rows.map((r, i) => ({
            course_id: r.course_id,
            order_index: i,
            due_date_offset_days: r.due_date_offset_days,
          })),
        }),
      });
      const j = (await res.json()) as { error?: string; pathId?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Lưu thất bại");
        return;
      }
      if (j.pathId) setPathId(j.pathId);
      toast.success(
        status === "draft" ? "Đã lưu nháp." : "Đã gửi cho học sinh."
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendApproveOnly() {
    if (!pathId) {
      toast.error("Lưu nháp trước để có mã lộ trình.");
      return;
    }
    if (pathStatus === "active") {
      toast.error("Lộ trình đang active.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/personalized-path/teacher/${pathId}/approve`,
        { method: "PUT" }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không gửi được");
        return;
      }
      toast.success("Đã chuyển sang chờ học sinh xác nhận.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  }

  const locked = pathStatus === "active";

  return (
    <div className="space-y-6">
      {pathStatus === "active" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Lộ trình đang <strong>active</strong>. Chỉnh sửa lại khi học sinh gửi
          góp ý (trạng thái revision_requested).
        </p>
      ) : null}
      {pathStatus === "revision_requested" && studentFeedback ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-medium text-foreground">Góp ý học sinh: </span>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {studentFeedback}
          </p>
        </div>
      ) : null}
      {reasoning ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Gợi ý AI / luật: </span>
          {reasoning}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={locked ? () => {} : onDragEnd}
      >
        <SortableContext
          items={rows.map((r) => r.course_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {rows.map((r) => (
              <SortableRow
                key={r.course_id}
                row={r}
                locked={locked}
                title={titleFor(r.course_id)}
                onOffset={(d) => {
                  if (!Number.isFinite(d) || d < 1) return;
                  setRows((prev) =>
                    prev.map((x) =>
                      x.course_id === r.course_id
                        ? { ...x, due_date_offset_days: d }
                        : x
                    )
                  );
                }}
                onRemove={() =>
                  setRows((prev) =>
                    prev
                      .filter((x) => x.course_id !== r.course_id)
                      .map((x, i) => ({ ...x, order_index: i }))
                  )
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Thêm khóa</label>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={addCourseId}
            onChange={(e) => setAddCourseId(e.target.value)}
          >
            <option value="">— Chọn —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.category})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={locked}
          className={cn(buttonVariants({ variant: "secondary" }))}
          onClick={() => {
            if (!addCourseId || rows.some((r) => r.course_id === addCourseId)) {
              return;
            }
            setRows((prev) => {
              const lastOff = prev[prev.length - 1]?.due_date_offset_days ?? 0;
              return [
                ...prev,
                {
                  course_id: addCourseId,
                  order_index: prev.length,
                  due_date_offset_days: lastOff + 7,
                },
              ];
            });
            setAddCourseId("");
          }}
        >
          Thêm
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || locked}
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => void save("draft")}
        >
          Lưu nháp
        </button>
        <button
          type="button"
          disabled={busy || locked}
          className={cn(buttonVariants())}
          onClick={() => void save("pending_student_approval")}
        >
          Lưu &amp; gửi học sinh
        </button>
        <button
          type="button"
          disabled={busy || locked || !pathId}
          className={cn(buttonVariants({ variant: "secondary" }))}
          onClick={() => void sendApproveOnly()}
        >
          Gửi duyệt (không đổi nội dung)
        </button>
        <Link
          href="/teacher/personalized-paths"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Danh sách
        </Link>
      </div>
    </div>
  );
}
