"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { QuizEditorDialog } from "@/components/teacher/quiz-editor";

const ORPHAN_ID = "__orphan__";

export type LessonType = "text" | "video" | "quiz";

type ApiLesson = {
  id: string;
  title: string;
  type: LessonType;
  content: string | null;
  video_url: string | null;
  time_estimate: number | null;
  is_free_preview?: boolean;
  order_index: number;
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    questions: unknown;
    time_limit: number | null;
    passing_score: number | null;
    is_published: boolean | null;
  } | null;
};

type ApiChapter = {
  id: string | null;
  title: string;
  description: string | null;
  order_index: number;
  lessons: ApiLesson[];
};

type EdLesson = {
  clientId: string;
  serverId?: string;
  title: string;
  type: LessonType;
  content: string | null;
  video_url: string | null;
  time_estimate: number | null;
  is_free_preview: boolean;
};

type EdChapter = {
  clientId: string;
  serverId?: string;
  title: string;
  description: string | null;
  lessons: EdLesson[];
};

function normalizeLessonType(t: string): LessonType {
  if (t === "video" || t === "quiz") return t;
  return "text";
}

function apiToState(rows: ApiChapter[]): EdChapter[] {
  return rows.map((ch) => ({
    clientId: ch.id ?? ORPHAN_ID,
    serverId: ch.id ?? undefined,
    title: ch.title,
    description: ch.description,
    lessons: ch.lessons.map((le) => ({
      clientId: le.id,
      serverId: le.id,
      title: le.title,
      type: normalizeLessonType(le.type),
      content: le.content,
      video_url: le.video_url,
      time_estimate: le.time_estimate,
      is_free_preview: le.is_free_preview === true,
    })),
  }));
}

function toPayload(chapters: EdChapter[]) {
  return {
    chapters: chapters.map((ch, ci) => ({
      id: ch.serverId,
      title: ch.title.trim() || "Chương",
      description: ch.description?.trim() || null,
      order_index: ci,
      lessons: ch.lessons.map((le, li) => ({
        id: le.serverId,
        title: le.title.trim(),
        type: le.type,
        content: le.content?.trim() || null,
        video_url: le.video_url?.trim() || null,
        time_estimate:
          le.time_estimate != null && le.time_estimate >= 0 ? le.time_estimate : null,
        is_free_preview: le.is_free_preview === true,
        order_index: li,
      })),
    })),
  };
}

function LessonTypeIcon({ type }: { type: LessonType }) {
  if (type === "video") return <Video className="text-primary h-4 w-4 shrink-0" />;
  if (type === "quiz")
    return <ClipboardList className="text-primary h-4 w-4 shrink-0" />;
  return <FileText className="text-primary h-4 w-4 shrink-0" />;
}

function LessonDropZone({ chapterClientId }: { chapterClientId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${chapterClientId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-muted-foreground mt-1 min-h-9 rounded-md border border-dashed px-2 py-2 text-center text-xs",
        isOver && "border-primary bg-primary/5 text-foreground"
      )}
    >
      Kéo bài vào đây (thêm cuối chương)
    </div>
  );
}

function SortableLessonRow({
  lesson,
  onEdit,
  onDelete,
  onOpenQuiz,
}: {
  lesson: EdLesson;
  onEdit: (l: EdLesson) => void;
  onDelete: (l: EdLesson) => void;
  onOpenQuiz: (l: EdLesson) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `ls-${lesson.clientId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const mins =
    lesson.time_estimate != null && lesson.time_estimate > 0
      ? `${lesson.time_estimate} phút`
      : "—";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card flex items-center gap-2 rounded-lg border px-2 py-2 text-sm shadow-sm",
        isDragging && "opacity-80 ring-2 ring-primary/30"
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        aria-label="Kéo bài học"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <LessonTypeIcon type={lesson.type} />
      <span className="min-w-0 flex-1 truncate font-medium">{lesson.title}</span>
      {lesson.is_free_preview ? (
        <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
          Xem trư��c
        </Badge>
      ) : null}
      <span className="text-muted-foreground shrink-0 tabular-nums text-xs">{mins}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="Quiz"
        onClick={() => onOpenQuiz(lesson)}
      >
        <ListChecks className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onEdit(lesson)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive h-8 w-8 shrink-0"
        onClick={() => onDelete(lesson)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SortableChapterCard({
  chapter,
  open,
  onToggleOpen,
  onTitleChange,
  onDeleteChapter,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onOpenQuiz,
}: {
  chapter: EdChapter;
  open: boolean;
  onToggleOpen: () => void;
  onTitleChange: (title: string) => void;
  onDeleteChapter: () => void;
  onAddLesson: () => void;
  onEditLesson: (l: EdLesson) => void;
  onDeleteLesson: (l: EdLesson) => void;
  onOpenQuiz: (l: EdLesson) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `ch-${chapter.clientId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const lessonIds = chapter.lessons.map((l) => `ls-${l.clientId}`);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("overflow-hidden border-border/80", isDragging && "opacity-90 ring-2 ring-primary/25")}
    >
      <CardHeader className="bg-muted/30 flex flex-row flex-wrap items-center gap-2 space-y-0 py-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded p-1 active:cursor-grabbing"
          aria-label="Kéo chương"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          className="text-muted-foreground hover:bg-muted/50 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          aria-expanded={open}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </button>
        <Input
          value={chapter.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="h-9 max-w-md flex-1 font-semibold"
          placeholder="Tên chương"
        />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onAddLesson}>
            <Plus className="h-3.5 w-3.5" />
            Thêm bài
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive h-8 w-8"
            onClick={onDeleteChapter}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-2 pt-0 pb-4">
          <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {chapter.lessons.map((le) => (
                <SortableLessonRow
                  key={le.clientId}
                  lesson={le}
                  onEdit={onEditLesson}
                  onDelete={onDeleteLesson}
                  onOpenQuiz={onOpenQuiz}
                />
              ))}
            </div>
          </SortableContext>
          <LessonDropZone chapterClientId={chapter.clientId} />
        </CardContent>
      ) : null}
    </Card>
  );
}

type LessonModalState =
  | { mode: "create"; chapterClientId: string }
  | { mode: "edit"; chapterClientId: string; lesson: EdLesson }
  | null;

export function CurriculumEditor({
  courseId,
  courseTitle,
  courseIsPublished,
}: {
  courseId: string;
  courseTitle: string;
  courseIsPublished: boolean;
}) {
  const [chapters, setChapters] = useState<EdChapter[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lessonModal, setLessonModal] = useState<LessonModalState>(null);
  const [chapterDelete, setChapterDelete] = useState<EdChapter | null>(null);
  const [lessonDelete, setLessonDelete] = useState<EdLesson | null>(null);
  const [quizLesson, setQuizLesson] = useState<EdLesson | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<LessonType>("text");
  const [formVideo, setFormVideo] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formMins, setFormMins] = useState("");
  const [formFreePreview, setFormFreePreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadStructure = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/structure`);
      const j = (await res.json()) as { chapters?: ApiChapter[]; error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải được giáo trình");
        setChapters([]);
        return;
      }
      const rows = Array.isArray(j.chapters) ? j.chapters : [];
      const next = apiToState(rows);
      setChapters(next);
      setExpanded((prev) => {
        const n = { ...prev };
        for (const ch of next) {
          if (n[ch.clientId] === undefined) n[ch.clientId] = true;
        }
        return n;
      });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (aid === oid) return;

    if (aid.startsWith("ch-")) {
      if (!oid.startsWith("ch-")) return;
      setChapters((prev) => {
        const oldI = prev.findIndex((c) => `ch-${c.clientId}` === aid);
        const newI = prev.findIndex((c) => `ch-${c.clientId}` === oid);
        if (oldI < 0 || newI < 0) return prev;
        return arrayMove(prev, oldI, newI);
      });
      return;
    }

    if (!aid.startsWith("ls-")) return;
    const activeLessonKey = aid.slice(3);

    setChapters((prev) => {
      const next = prev.map((c) => ({ ...c, lessons: [...c.lessons] }));

      let si = -1;
      let sj = -1;
      for (let i = 0; i < next.length; i++) {
        const j = next[i].lessons.findIndex((l) => l.clientId === activeLessonKey);
        if (j >= 0) {
          si = i;
          sj = j;
          break;
        }
      }
      if (si < 0) return prev;

      let ti = -1;
      let tj = -1;

      if (oid.startsWith("ls-")) {
        const overLessonKey = oid.slice(3);
        for (let i = 0; i < next.length; i++) {
          const j = next[i].lessons.findIndex((l) => l.clientId === overLessonKey);
          if (j >= 0) {
            ti = i;
            tj = j;
            break;
          }
        }
      } else if (oid.startsWith("drop-")) {
        const dropCh = oid.slice(5);
        ti = next.findIndex((c) => c.clientId === dropCh);
        if (ti >= 0) tj = next[ti].lessons.length;
      }

      if (ti < 0) return prev;

      if (si === ti) {
        const lessons = [...next[si].lessons];
        const oldIdx = lessons.findIndex((l) => l.clientId === activeLessonKey);
        if (oldIdx < 0) return prev;
        if (oid.startsWith("drop-")) {
          const [moved] = lessons.splice(oldIdx, 1);
          lessons.push(moved);
          next[si] = { ...next[si], lessons };
          return next;
        }
        const newIdx = lessons.findIndex((l) => l.clientId === oid.slice(3));
        if (newIdx < 0) return prev;
        next[si] = { ...next[si], lessons: arrayMove(lessons, oldIdx, newIdx) };
        return next;
      }

      const moved = next[si].lessons[sj];
      next[si].lessons.splice(sj, 1);
      if (oid.startsWith("drop-")) {
        next[ti].lessons.push(moved);
      } else {
        const insertAt = next[ti].lessons.findIndex((l) => l.clientId === oid.slice(3));
        if (insertAt < 0) return prev;
        next[ti].lessons.splice(insertAt, 0, moved);
      }
      return next;
    });
  }

  function openCreateLesson(chapterClientId: string) {
    setFormTitle("");
    setFormType("text");
    setFormVideo("");
    setFormContent("");
    setFormMins("");
    setFormFreePreview(false);
    setLessonModal({ mode: "create", chapterClientId });
  }

  function openEditLesson(chapterClientId: string, lesson: EdLesson) {
    setFormTitle(lesson.title);
    setFormType(lesson.type);
    setFormVideo(lesson.video_url ?? "");
    setFormContent(lesson.content ?? "");
    setFormMins(
      lesson.time_estimate != null && lesson.time_estimate > 0
        ? String(lesson.time_estimate)
        : ""
    );
    setFormFreePreview(lesson.is_free_preview === true);
    setLessonModal({ mode: "edit", chapterClientId, lesson });
  }

  function submitLessonModal() {
    if (!lessonModal) return;
    const title = formTitle.trim();
    if (!title) {
      toast.error("Nhập tiêu đề bài học");
      return;
    }
    const minsRaw = formMins.trim();
    const timeEst =
      minsRaw === "" ? null : Math.min(24 * 60, Math.max(0, parseInt(minsRaw, 10) || 0));

    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.clientId !== lessonModal.chapterClientId) return ch;
        if (lessonModal.mode === "create") {
          const nu: EdLesson = {
            clientId: crypto.randomUUID(),
            title,
            type: formType,
            content: formContent.trim() || null,
            video_url: formVideo.trim() || null,
            time_estimate: timeEst,
            is_free_preview: formFreePreview,
          };
          return { ...ch, lessons: [...ch.lessons, nu] };
        }
        return {
          ...ch,
          lessons: ch.lessons.map((l) =>
            l.clientId === lessonModal.lesson.clientId
              ? {
                  ...l,
                  title,
                  type: formType,
                  content: formContent.trim() || null,
                  video_url: formVideo.trim() || null,
                  time_estimate: timeEst,
                  is_free_preview: formFreePreview,
                }
              : l
          ),
        };
      })
    );
    setLessonModal(null);
    toast.success(lessonModal.mode === "create" ? "Đã thêm bài (nhớ Lưu)" : "Đã cập nhật (nhớ Lưu)");
  }

  function confirmRemoveLesson(le: EdLesson) {
    setLessonDelete(le);
  }

  function doRemoveLesson() {
    if (!lessonDelete) return;
    const id = lessonDelete.clientId;
    setChapters((prev) =>
      prev.map((ch) => ({
        ...ch,
        lessons: ch.lessons.filter((l) => l.clientId !== id),
      }))
    );
    setLessonDelete(null);
    toast.success("Đã xóa bài (nhớ Lưu)");
  }

  function addChapter() {
    const nu: EdChapter = {
      clientId: crypto.randomUUID(),
      title: `Chương ${chapters.length + 1}`,
      description: null,
      lessons: [],
    };
    setChapters((c) => [...c, nu]);
    setExpanded((e) => ({ ...e, [nu.clientId]: true }));
  }

  function removeChapter(ch: EdChapter) {
    setChapters((prev) => prev.filter((x) => x.clientId !== ch.clientId));
    setChapterDelete(null);
    toast.success("Đã xóa chương (nhớ Lưu)");
  }

  async function saveStructure() {
    setSaving(true);
    try {
      const body = toPayload(chapters);
      const res = await fetch(`/api/courses/${courseId}/structure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không lưu được");
        return;
      }
      toast.success("Đã lưu giáo trình");
      await loadStructure();
    } finally {
      setSaving(false);
    }
  }

  function previewStudent() {
    window.open(`/student/courses/${courseId}`, "_blank", "noopener,noreferrer");
  }

  function openQuizEditor(le: EdLesson) {
    if (!le.serverId) {
      toast.error("Luu giao trinh truoc de co ID bai hoc, roi mo Quiz.");
      return;
    }
    setQuizLesson(le);
  }

  const chapterIds = chapters.map((c) => `ch-${c.clientId}`);

  if (loading) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">Đang tải giáo trình…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{courseTitle}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Giáo trình (chương &amp; bài học)</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold",
                courseIsPublished
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
              )}
            >
              {courseIsPublished ? "Đang xuất bản" : "Nháp"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={previewStudent}>
            {"Xem tr\u01B0\u1EDBc"}
          </Button>
          <Button type="button" onClick={() => void saveStructure()} disabled={saving}>
            {saving ? "\u0110ang l\u01B0u\u2026" : "L\u01B0u thay \u0111\u1ED5i"}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {
          "K\u00E9o ch\u01B0\u01A1ng ho\u1EB7c b\u00E0i h\u1ECDc \u0111\u1EC3 s\u1EAFp x\u1EBFp. K\u00E9o b\u00E0i gi\u1EEFa c\u00E1c ch\u01B0\u01A1ng \u0111\u1EC3 di chuy\u1EC3n. Nh\u1EA5n L\u01B0u \u0111\u1EC3 \u0111\u1ED3ng b\u1ED9 server."
        }
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="gap-1.5" onClick={addChapter}>
          <Plus className="h-4 w-4" />
          Thêm chương
        </Button>
      </div>

      {chapters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            {
              "Ch\u01B0a c\u00F3 ch\u01B0\u01A1ng. Nh\u1EA5n \"Th\u00EAm ch\u01B0\u01A1ng\" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u."
            }
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {chapters.map((ch) => (
                <SortableChapterCard
                  key={ch.clientId}
                  chapter={ch}
                  open={expanded[ch.clientId] !== false}
                  onToggleOpen={() =>
                    setExpanded((e) => {
                      const cur = e[ch.clientId] !== false;
                      return { ...e, [ch.clientId]: !cur };
                    })
                  }
                  onTitleChange={(title) =>
                    setChapters((prev) =>
                      prev.map((c) => (c.clientId === ch.clientId ? { ...c, title } : c))
                    )
                  }
                  onDeleteChapter={() => setChapterDelete(ch)}
                  onAddLesson={() => openCreateLesson(ch.clientId)}
                  onEditLesson={(l) => openEditLesson(ch.clientId, l)}
                  onDeleteLesson={confirmRemoveLesson}
                  onOpenQuiz={openQuizEditor}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={!!lessonModal} onOpenChange={(o) => !o && setLessonModal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {lessonModal?.mode === "create" ? "Thêm bài học" : "Sửa bài học"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-title">Tiêu đề</Label>
              <Input
                id="m-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Tên bài"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loại bài</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as LessonType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Bài đọc</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="quiz">Kiểm tra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-video">Video URL</Label>
              <Input
                id="m-video"
                value={formVideo}
                onChange={(e) => setFormVideo(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-mins">
                {"Th\u1EDDi l\u01B0\u1EE3ng \u01B0\u1EDBc t\u00EDnh (ph\u00FAt)"}
              </Label>
              <Input
                id="m-mins"
                type="number"
                min={0}
                max={1440}
                value={formMins}
                onChange={(e) => setFormMins(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="m-free"
                checked={formFreePreview}
                onCheckedChange={(v) => setFormFreePreview(v === true)}
              />
              <Label htmlFor="m-free" className="cursor-pointer text-sm font-normal">
                {"Cho ph\u00e9p xem tr\u01b0\u1edbc (ch\u01b0a \u0111\u0103ng k\u00fd)"}
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-content">Nội dung / mô tả</Label>
              <Textarea
                id="m-content"
                rows={5}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />
            </div>
            {lessonModal?.mode === "edit" && lessonModal.lesson.serverId ? (
              <div className="border-t pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => {
                    const le = lessonModal.lesson;
                    setLessonModal(null);
                    openQuizEditor(le);
                  }}
                >
                  <ListChecks className="h-4 w-4" />
                  Quan ly quiz (trac nghiem)
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLessonModal(null)}>
              {"Hu\u1EF7"}
            </Button>
            <Button type="button" onClick={submitLessonModal}>
              {lessonModal?.mode === "create" ? "Thêm" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chapterDelete} onOpenChange={(o) => !o && setChapterDelete(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Xóa chương?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {chapterDelete && chapterDelete.lessons.length > 0
              ? `Ch\u01B0\u01A1ng c\u00F3 ${chapterDelete.lessons.length} b\u00E0i h\u1ECDc \u2014 t\u1EA5t c\u1EA3 s\u1EBD b\u1ECB x\u00F3a kh\u1ECFi server khi b\u1EA1n L\u01B0u.`
              : "X\u00F3a ch\u01B0\u01A1ng tr\u1ED1ng kh\u1ECFi danh s\u00E1ch."}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChapterDelete(null)}>
              {"Hu\u1EF7"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => chapterDelete && removeChapter(chapterDelete)}
            >
              Xóa chương
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quizLesson?.serverId ? (
        <QuizEditorDialog
          open={!!quizLesson}
          onOpenChange={(o) => {
            if (!o) setQuizLesson(null);
          }}
          courseId={courseId}
          lessonId={quizLesson.serverId}
          lessonTitle={quizLesson.title}
          onSaved={() => void loadStructure()}
        />
      ) : null}

      <Dialog open={!!lessonDelete} onOpenChange={(o) => !o && setLessonDelete(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Xóa bài học?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {
              "B\u00E0i s\u1EBD b\u1ECB g\u1EE1 kh\u1ECFi danh s\u00E1ch. Nh\u1EA5n L\u01B0u \u0111\u1EC3 c\u1EADp nh\u1EADt server."
            }
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLessonDelete(null)}>
              {"Hu\u1EF7"}
            </Button>
            <Button type="button" variant="destructive" onClick={doRemoveLesson}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
