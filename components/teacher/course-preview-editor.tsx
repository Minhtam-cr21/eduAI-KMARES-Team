"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AICourseDraft } from "@/lib/ai/ai-course-draft";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";

function SortableLessonItem({
  id,
  title,
  index,
  active,
  onSelect,
}: {
  id: string;
  title: string;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border px-2 py-2 text-left text-sm transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-card hover:bg-muted/40",
        isDragging && "opacity-70"
      )}
    >
      <span
        className="text-muted-foreground mt-0.5 shrink-0 cursor-grab touch-none p-0.5 active:cursor-grabbing"
        aria-label="Kéo để sắp xếp"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs font-medium">{index + 1}.</span>{" "}
        <span className="break-words">{title || "(Chưa có tiêu đề)"}</span>
      </span>
    </button>
  );
}

export function CoursePreviewEditor({
  value,
  onChange,
  disabled,
}: {
  value: AICourseDraft;
  onChange: (next: AICourseDraft) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [itemIds, setItemIds] = useState<string[]>(() =>
    value.lessons.map(() => crypto.randomUUID())
  );

  useEffect(() => {
    setItemIds((prev) => {
      if (prev.length === value.lessons.length) return prev;
      return value.lessons.map((_, i) => prev[i] ?? crypto.randomUUID());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ids only when lesson count changes
  }, [value.lessons.length]);

  useEffect(() => {
    if (selected >= value.lessons.length) {
      setSelected(Math.max(0, value.lessons.length - 1));
    }
  }, [selected, value.lessons.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextLessons = arrayMove(value.lessons, oldIndex, newIndex);
    const nextIds = arrayMove(itemIds, oldIndex, newIndex);
    setItemIds(nextIds);
    onChange({ ...value, lessons: nextLessons });
    setSelected(newIndex);
  }

  const lesson = value.lessons[selected];

  function patchLesson(patch: Partial<(typeof value.lessons)[0]>) {
    const next = [...value.lessons];
    next[selected] = { ...next[selected], ...patch };
    onChange({ ...value, lessons: next });
  }

  return (
    <div className="grid max-h-[min(70vh,800px)] gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
      <div className="flex min-h-0 flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium">Bài học — kéo để đổi thứ tự</p>
        <ScrollArea className="h-[min(60vh,560px)] rounded-lg border border-border/60 pr-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e)}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5 p-2">
                {value.lessons.map((l, i) => (
                  <SortableLessonItem
                    key={itemIds[i] ?? `lesson-${i}`}
                    id={itemIds[i] ?? `lesson-${i}`}
                    title={l.title}
                    index={i}
                    active={selected === i}
                    onSelect={() => setSelected(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </div>

      <ScrollArea className="h-[min(70vh,800px)] rounded-lg border border-border/60">
        <div className="space-y-4 p-4">
          <div className="space-y-3 border-b border-border/60 pb-4">
            <h3 className="text-sm font-semibold">Thông tin khóa học</h3>
            <div className="space-y-1.5">
              <Label htmlFor="pv-title">Tiêu đề</Label>
              <Input
                id="pv-title"
                value={value.title}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pv-desc">Mô tả</Label>
              <Textarea
                id="pv-desc"
                rows={3}
                value={value.description}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    description: e.target.value,
                    content: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pv-cat">Danh mục</Label>
                <Input
                  id="pv-cat"
                  value={value.category}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, category: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pv-type">Loại</Label>
                <select
                  id="pv-type"
                  disabled={disabled}
                  value={value.course_type}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      course_type: e.target.value as AICourseDraft["course_type"],
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="skill">Kỹ năng</option>
                  <option value="role">Vai trò</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pv-thumb">Thumbnail URL</Label>
              <Input
                id="pv-thumb"
                type="url"
                placeholder="https://…"
                value={value.thumbnail_url ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    thumbnail_url: e.target.value.trim() || null,
                  })
                }
              />
            </div>
          </div>

          {lesson ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Bài {selected + 1}</h3>
              <div className="space-y-1.5">
                <Label htmlFor="pv-ltitle">Tiêu đề bài</Label>
                <Input
                  id="pv-ltitle"
                  value={lesson.title}
                  disabled={disabled}
                  onChange={(e) => patchLesson({ title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nội dung (Markdown)</Label>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="h-8">
                    <TabsTrigger value="edit" className="text-xs">
                      Sửa
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs">
                      Xem trước
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit" className="mt-2">
                    <Textarea
                      value={lesson.content}
                      disabled={disabled}
                      onChange={(e) => patchLesson({ content: e.target.value })}
                      rows={14}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-border/60 bg-muted/20 p-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content || "_(Trống)_"}</ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pv-video">Video URL</Label>
                <Input
                  id="pv-video"
                  type="url"
                  value={lesson.video_url ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    patchLesson({ video_url: e.target.value.trim() || null })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pv-code">Code mẫu (tuỳ chọn)</Label>
                <Textarea
                  id="pv-code"
                  value={lesson.code_template ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    patchLesson({ code_template: e.target.value.trim() || null })
                  }
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Không có bài học.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
