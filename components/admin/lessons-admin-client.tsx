"use client";

import { GOAL_OPTIONS, type GoalSlug } from "@/lib/goals";
import { lessonFormSchema, type LessonFormValues } from "@/lib/validations/lesson";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type LessonRow = {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  is_published: boolean;
  goals: string[] | null;
  created_at: string;
};

type Props = {
  topicId: string;
  topicTitle: string;
  lessons: LessonRow[];
};

function normalizeLessonFormValues(values: LessonFormValues): LessonFormValues {
  const n = Number(values.order_index);
  const rawGoals = Array.isArray(values.goals) ? values.goals : [];
  const goals = GOAL_OPTIONS.map((o) => o.value).filter((g) =>
    rawGoals.includes(g)
  ) as GoalSlug[];
  return {
    title: String(values.title ?? "").trim(),
    content: values.content == null ? "" : String(values.content),
    video_url:
      values.video_url == null || String(values.video_url).trim() === ""
        ? undefined
        : String(values.video_url).trim(),
    order_index: Number.isFinite(n) ? Math.trunc(n) : 0,
    is_published: Boolean(values.is_published),
    goals,
  };
}

function rowToPayload(row: LessonRow): LessonFormValues {
  const g = row.goals?.length
    ? (row.goals.filter((x): x is GoalSlug =>
        GOAL_OPTIONS.some((o) => o.value === x)
      ) as GoalSlug[])
    : [];
  return {
    title: row.title,
    content: row.content ?? "",
    video_url: row.video_url ?? undefined,
    order_index: row.order_index,
    is_published: row.is_published,
    goals: g,
  };
}

async function parseJson(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    return (await res.json()) as { error?: string } & Record<string, unknown>;
  } catch {
    return {};
  }
}

export function LessonsAdminClient({
  topicId,
  topicTitle,
  lessons,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [items, setItems] = useState<LessonRow[]>(lessons);
  const preDragItems = useRef<LessonRow[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setItems(lessons);
  }, [lessons]);

  const sortableIds = useMemo(() => items.map((l) => l.id), [items]);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema) as Resolver<LessonFormValues>,
    defaultValues: {
      title: "",
      content: "",
      video_url: undefined,
      order_index: 0,
      is_published: false,
      goals: [],
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      form.reset({
        title: editing.title,
        content: editing.content ?? "",
        video_url: editing.video_url ?? undefined,
        order_index: editing.order_index,
        is_published: editing.is_published,
        goals: rowToPayload(editing).goals,
      });
    } else {
      form.reset({
        title: "",
        content: "",
        video_url: undefined,
        order_index:
          items.length > 0
            ? Math.max(...items.map((l) => l.order_index)) + 1
            : 0,
        is_published: false,
        goals: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing, items]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: LessonRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function onSubmit(values: LessonFormValues) {
    const normalized = normalizeLessonFormValues(values);

    if (editing) {
      const res = await fetch(`/api/admin/lessons/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        toast.error("Không lưu được bài học", {
          description: typeof data.error === "string" ? data.error : res.statusText,
        });
        return;
      }
      toast.success("Đã cập nhật bài học.");
    } else {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          ...normalized,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        toast.error("Không tạo được bài học", {
          description: typeof data.error === "string" ? data.error : res.statusText,
        });
        return;
      }
      toast.success("Đã thêm bài học.");
    }
    setDialogOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(row: LessonRow) {
    if (!window.confirm(`Xóa bài học “${row.title}”?`)) return;
    const res = await fetch(`/api/admin/lessons/${row.id}`, { method: "DELETE" });
    const data = await parseJson(res);
    if (!res.ok) {
      toast.error("Không xóa được bài học", {
        description: typeof data.error === "string" ? data.error : res.statusText,
      });
      return;
    }
    toast.success("Đã xóa bài học.");
    router.refresh();
  }

  async function handleTogglePublish(row: LessonRow) {
    const next = !row.is_published;
    const payload = { ...rowToPayload(row), is_published: next };
    const res = await fetch(`/api/admin/lessons/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    if (!res.ok) {
      toast.error("Không cập nhật trạng thái publish", {
        description: typeof data.error === "string" ? data.error : res.statusText,
      });
      return;
    }
    toast.success(next ? "Đã publish." : "Đã gỡ publish.");
    router.refresh();
  }

  function handleDragStart() {
    preDragItems.current = items;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((l) => l.id === active.id);
    const newIndex = items.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const withOrder = reordered.map((lesson, i) => ({
      ...lesson,
      order_index: i,
    }));
    setItems(withOrder);

    try {
      await Promise.all(
        withOrder.map((lesson) =>
          fetch(`/api/admin/lessons/${lesson.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rowToPayload(lesson)),
          }).then(async (res) => {
            const data = await parseJson(res);
            if (!res.ok) {
              throw new Error(
                typeof data.error === "string" ? data.error : res.statusText
              );
            }
          })
        )
      );
      toast.success("Đã cập nhật thứ tự.");
      router.refresh();
    } catch (e) {
      toast.error("Không lưu được thứ tự", {
        description: e instanceof Error ? e.message : String(e),
      });
      if (preDragItems.current) setItems(preDragItems.current);
      preDragItems.current = null;
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/admin/topics" className="underline underline-offset-4">
              ← Danh sách chủ đề
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Bài học: {topicTitle}
          </h1>
          <p className="text-muted-foreground text-sm">
            Chủ đề ID: <code className="text-xs">{topicId}</code>
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Thêm bài học
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 px-2" aria-label="Sắp xếp" />
                <TableHead>Tiêu đề</TableHead>
                <TableHead className="w-24">Thứ tự</TableHead>
                <TableHead className="w-36">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-10 text-center"
                >
                  Chưa có bài học nào trong chủ đề này.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 px-2" aria-label="Sắp xếp" />
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead className="w-24">Thứ tự</TableHead>
                  <TableHead className="w-36">Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((row) => (
                    <SortableLessonRow
                      key={row.id}
                      row={row}
                      onEdit={() => openEdit(row)}
                      onDelete={() => void handleDelete(row)}
                      onTogglePublish={() => void handleTogglePublish(row)}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </div>
        </DndContext>
      )}

      <p className="text-muted-foreground text-xs">
        Kéo icon ⋮⋮ để đổi thứ tự (lưu <code className="text-[11px]">order_index</code>{" "}
        qua API).
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa bài học" : "Thêm bài học"}
            </DialogTitle>
            <DialogDescription>
              Nội dung thuộc chủ đề &quot;{topicTitle}&quot;. Markdown trong nội dung
              được hiển thị ở phía học viên nếu UI bài học dùng renderer Markdown.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Tiêu đề</Label>
              <Input id="lesson-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-content">Nội dung (Markdown / text)</Label>
              <Textarea
                id="lesson-content"
                rows={8}
                className="font-mono text-sm"
                {...form.register("content")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-video">Video URL (tuỳ chọn)</Label>
              <Input
                id="lesson-video"
                type="url"
                placeholder="https://..."
                {...form.register("video_url")}
              />
              {form.formState.errors.video_url && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.video_url.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-order">Thứ tự (số nguyên)</Label>
              <Input
                id="lesson-order"
                type="number"
                {...form.register("order_index")}
              />
              {form.formState.errors.order_index && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.order_index.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Goals</Label>
              <p className="text-muted-foreground text-xs">
                Không chọn = áp dụng mọi mục tiêu học viên.
              </p>
              <div className="flex flex-wrap gap-3">
                {GOAL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={form.watch("goals").includes(opt.value)}
                      onCheckedChange={(c) => {
                        const cur = form.getValues("goals");
                        if (c === true) {
                          if (!cur.includes(opt.value)) {
                            form.setValue(
                              "goals",
                              [...cur, opt.value],
                              { shouldValidate: true }
                            );
                          }
                        } else {
                          form.setValue(
                            "goals",
                            cur.filter((x) => x !== opt.value),
                            { shouldValidate: true }
                          );
                        }
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="is_published"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                )}
              />
              <Label className="font-normal">Publish ngay</Label>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu…" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableLessonRow({
  row,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  row: LessonRow;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10 px-2 align-middle">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
          aria-label="Kéo để sắp xếp"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{row.title}</TableCell>
      <TableCell className="tabular-nums">{row.order_index}</TableCell>
      <TableCell>
        {row.is_published ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Đã publish
          </span>
        ) : (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Nháp
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={`/admin/lessons/${row.id}/exercises`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Xem bài tập
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Sửa
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTogglePublish}
          >
            {row.is_published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            Xóa
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
