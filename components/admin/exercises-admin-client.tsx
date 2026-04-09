"use client";

import {
  exerciseFormSchema,
  type ExerciseFormValues,
  exerciseLangSchema,
} from "@/lib/validations/exercise";
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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type ExerciseRow = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  hint_logic: string | null;
  code_hint: string | null;
  initial_code: string | null;
  sample_input: string | null;
  sample_output: string | null;
  language: string;
  order_index: number;
  created_at: string;
};

type Props = {
  lessonId: string;
};

const LANG_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
] as const;

function nullToEmpty(s: string | null | undefined): string {
  return s ?? "";
}

function rowToFormValues(row: ExerciseRow): ExerciseFormValues {
  const lang = exerciseLangSchema.safeParse(row.language);
  return {
    title: row.title,
    description: nullToEmpty(row.description),
    hint_logic: nullToEmpty(row.hint_logic),
    code_hint: nullToEmpty(row.code_hint),
    initial_code: nullToEmpty(row.initial_code),
    sample_input: nullToEmpty(row.sample_input),
    sample_output: nullToEmpty(row.sample_output),
    language: lang.success ? lang.data : "python",
    order_index: row.order_index,
  };
}

function rowToPayload(row: ExerciseRow): ExerciseFormValues {
  return rowToFormValues(row);
}

async function parseJson(
  res: Response
): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    return (await res.json()) as { error?: string } & Record<string, unknown>;
  } catch {
    return {};
  }
}

export function ExercisesAdminClient({ lessonId }: Props) {
  const [items, setItems] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const preDragItems = useRef<ExerciseRow[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/exercises?lessonId=${encodeURIComponent(lessonId)}`
      );
      const data = await parseJson(res);
      if (!res.ok) {
        toast.error("Không tải được danh sách", {
          description: typeof data.error === "string" ? data.error : res.statusText,
        });
        setItems([]);
        return;
      }
      const list = data.exercises;
      setItems(Array.isArray(list) ? (list as ExerciseRow[]) : []);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const sortableIds = useMemo(() => items.map((e) => e.id), [items]);

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema) as Resolver<ExerciseFormValues>,
    defaultValues: {
      title: "",
      description: "",
      hint_logic: "",
      code_hint: "",
      initial_code: "",
      sample_input: "",
      sample_output: "",
      language: "python",
      order_index: 0,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      form.reset(rowToFormValues(editing));
    } else {
      form.reset({
        title: "",
        description: "",
        hint_logic: "",
        code_hint: "",
        initial_code: "",
        sample_input: "",
        sample_output: "",
        language: "python",
        order_index:
          items.length > 0
            ? Math.max(...items.map((e) => e.order_index)) + 1
            : 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing, items]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: ExerciseRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function onSubmit(values: ExerciseFormValues) {
    if (editing) {
      const res = await fetch(`/api/admin/exercises/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        toast.error("Không lưu được bài tập", {
          description: typeof data.error === "string" ? data.error : res.statusText,
        });
        return;
      }
      toast.success("Đã cập nhật bài tập.");
    } else {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, ...values }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        toast.error("Không tạo được bài tập", {
          description: typeof data.error === "string" ? data.error : res.statusText,
        });
        return;
      }
      toast.success("Đã thêm bài tập.");
    }
    setDialogOpen(false);
    setEditing(null);
    await loadList();
  }

  async function handleDelete(row: ExerciseRow) {
    if (!window.confirm(`Xóa bài tập “${row.title}”?`)) return;
    const res = await fetch(`/api/admin/exercises/${row.id}`, { method: "DELETE" });
    const data = await parseJson(res);
    if (!res.ok) {
      toast.error("Không xóa được bài tập", {
        description: typeof data.error === "string" ? data.error : res.statusText,
      });
      return;
    }
    toast.success("Đã xóa bài tập.");
    await loadList();
  }

  function handleDragStart() {
    preDragItems.current = items;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((e) => e.id === active.id);
    const newIndex = items.findIndex((e) => e.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const withOrder = reordered.map((ex, i) => ({
      ...ex,
      order_index: i,
    }));
    setItems(withOrder);

    try {
      await Promise.all(
        withOrder.map((ex) =>
          fetch(`/api/admin/exercises/${ex.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rowToPayload(ex)),
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
      await loadList();
    } catch (e) {
      toast.error("Không lưu được thứ tự", {
        description: e instanceof Error ? e.message : String(e),
      });
      if (preDragItems.current) setItems(preDragItems.current);
      preDragItems.current = null;
      await loadList();
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
            Quản lý bài tập
          </h1>
          <p className="text-muted-foreground text-sm">
            Lesson ID: <code className="text-xs">{lessonId}</code>
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Thêm bài tập
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 px-2" aria-label="Sắp xếp" />
                <TableHead>Tiêu đề</TableHead>
                <TableHead className="w-32">Ngôn ngữ</TableHead>
                <TableHead className="w-24">Thứ tự</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-10 text-center"
                >
                  Chưa có bài tập nào.
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
                  <TableHead className="w-32">Ngôn ngữ</TableHead>
                  <TableHead className="w-24">Thứ tự</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((row) => (
                    <SortableExerciseRow
                      key={row.id}
                      row={row}
                      onEdit={() => openEdit(row)}
                      onDelete={() => void handleDelete(row)}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </div>
        </DndContext>
      )}

      <p className="text-muted-foreground text-xs">
        Kéo icon ⋮⋮ để đổi thứ tự (cập nhật <code className="text-[11px]">order_index</code>
        ).
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa bài tập" : "Thêm bài tập"}</DialogTitle>
            <DialogDescription>
              Đề bài và gợi ý có thể dùng Markdown (hiển thị phía học viên tuỳ trang).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ex-title">Tiêu đề</Label>
              <Input id="ex-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-desc">Mô tả / đề bài (Markdown)</Label>
              <Textarea
                id="ex-desc"
                rows={4}
                className="font-mono text-sm"
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-hint-logic">Logic gợi ý (Markdown)</Label>
              <Textarea
                id="ex-hint-logic"
                rows={3}
                className="font-mono text-sm"
                {...form.register("hint_logic")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-code-hint">Gợi ý code</Label>
              <Textarea
                id="ex-code-hint"
                rows={3}
                className="font-mono text-sm"
                {...form.register("code_hint")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-initial">Code mẫu ban đầu</Label>
              <Textarea
                id="ex-initial"
                rows={5}
                className="font-mono text-sm"
                {...form.register("initial_code")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ex-in">Sample input</Label>
                <Textarea
                  id="ex-in"
                  rows={3}
                  className="font-mono text-sm"
                  {...form.register("sample_input")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-out">Sample output</Label>
                <Textarea
                  id="ex-out"
                  rows={3}
                  className="font-mono text-sm"
                  {...form.register("sample_output")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select
                  value={form.watch("language")}
                  onValueChange={(v) =>
                    form.setValue("language", exerciseLangSchema.parse(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANG_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-order">Thứ tự</Label>
                <Input
                  id="ex-order"
                  type="number"
                  {...form.register("order_index")}
                />
                {form.formState.errors.order_index && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.order_index.message}
                  </p>
                )}
              </div>
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

function SortableExerciseRow({
  row,
  onEdit,
  onDelete,
}: {
  row: ExerciseRow;
  onEdit: () => void;
  onDelete: () => void;
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

  const langLabel =
    LANG_OPTIONS.find((o) => o.value === row.language)?.label ?? row.language;

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
      <TableCell>{langLabel}</TableCell>
      <TableCell className="tabular-nums">{row.order_index}</TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Sửa
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
