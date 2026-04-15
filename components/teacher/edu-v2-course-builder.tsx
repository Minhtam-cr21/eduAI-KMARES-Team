"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BookOpen, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ContentRow = {
  id: string;
  content_type: string;
  order: number;
  content_data: Record<string, unknown>;
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lesson_type: string;
  duration_minutes: number;
  contents: ContentRow[];
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonRow[];
};

const LESSON_TYPES = [
  "lecture",
  "interactive",
  "code-along",
  "quiz",
  "project",
] as const;

const CONTENT_TYPES = ["video", "text", "code_editor", "quiz", "resource"] as const;

export function EduV2CourseBuilder({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Record<string, unknown> | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMod, setOpenMod] = useState<Record<string, boolean>>({});

  const [contentDlg, setContentDlg] = useState<{
    lessonId: string;
    type: (typeof CONTENT_TYPES)[number];
  } | null>(null);
  const [contentForm, setContentForm] = useState({
    videoTitle: "",
    videoUrl: "",
    textBody: "",
    codeTitle: "",
    language: "python",
    starter_code: "",
    quizTitle: "",
    quizJson: `{"passing_score":70,"questions":[]}`,
    resourceTitle: "",
    resourceUrl: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/courses/${courseId}?include=structure`);
      const j = (await res.json()) as {
        course?: Record<string, unknown>;
        modules?: ModuleRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải được khóa học");
        return;
      }
      setCourse(j.course ?? null);
      setModules(j.modules ?? []);
      const o: Record<string, boolean> = {};
      for (const m of j.modules ?? []) o[m.id] = true;
      setOpenMod(o);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCourseMeta(fd: FormData) {
    const body = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      category: String(fd.get("category") ?? "").trim() || null,
      level: fd.get("level") as string,
      duration_hours: Number(fd.get("duration_hours") ?? 0) || 0,
      language: String(fd.get("language") ?? "vi").trim() || "vi",
      thumbnail_url: String(fd.get("thumbnail_url") ?? "").trim() || null,
      is_published: fd.get("is_published") === "on",
    };
    const res = await fetch(`/api/v2/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error ?? "Lưu thất bại");
      return;
    }
    toast.success("Đã lưu thông tin khóa học");
    await load();
  }

  async function addModule() {
    const res = await fetch(`/api/v2/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Chương ${modules.length + 1}`,
        description: null,
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Không tạo được chương");
      return;
    }
    toast.success("Đã thêm chương");
    await load();
  }

  async function updateModule(m: ModuleRow, patch: Partial<ModuleRow>) {
    const res = await fetch(`/api/v2/modules/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Cập nhật thất bại");
      return;
    }
    await load();
  }

  async function deleteModule(id: string) {
    if (!confirm("Xóa chương và tất cả bài học bên trong?")) return;
    const res = await fetch(`/api/v2/modules/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Không xóa được");
      return;
    }
    toast.success("Đã xóa chương");
    await load();
  }

  async function addLesson(moduleId: string) {
    const res = await fetch(`/api/v2/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Bài học mới",
        lesson_type: "lecture",
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Không tạo được bài");
      return;
    }
    toast.success("Đã thêm bài học");
    await load();
  }

  async function updateLesson(
    lessonId: string,
    patch: Record<string, unknown>
  ) {
    const res = await fetch(`/api/v2/lessons/${lessonId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Cập nhật thất bại");
      return;
    }
    await load();
  }

  async function deleteLesson(id: string) {
    if (!confirm("Xóa bài học và nội dung?")) return;
    const res = await fetch(`/api/v2/lessons/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Không xóa được");
      return;
    }
    toast.success("Đã xóa bài học");
    await load();
  }

  async function deleteContent(lessonId: string, contentId: string) {
    const res = await fetch(
      `/api/v2/lessons/${lessonId}/contents/${contentId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Không xóa được nội dung");
      return;
    }
    toast.success("Đã xóa nội dung");
    await load();
  }

  async function submitContent() {
    if (!contentDlg) return;
    const lessonId = contentDlg.lessonId;
    const t = contentDlg.type;
    let content_data: Record<string, unknown> = {};

    if (t === "video") {
      content_data = {
        title: contentForm.videoTitle || "Video",
        url: contentForm.videoUrl,
      };
    } else if (t === "text") {
      content_data = {
        title: "Nội dung",
        body: contentForm.textBody,
      };
    } else if (t === "code_editor") {
      content_data = {
        title: contentForm.codeTitle || "Code",
        language: contentForm.language,
        starter_code: contentForm.starter_code,
      };
    } else if (t === "quiz") {
      try {
        content_data = JSON.parse(contentForm.quizJson) as Record<
          string,
          unknown
        >;
        content_data.title = contentForm.quizTitle || "Quiz";
      } catch {
        toast.error("JSON khong hop le");
        return;
      }
    } else if (t === "resource") {
      content_data = {
        title: contentForm.resourceTitle || "Tài liệu",
        file_url: contentForm.resourceUrl,
      };
    }

    const res = await fetch(`/api/v2/lessons/${lessonId}/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: t, content_data }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      toast.error(j.error ?? "Không thêm được nội dung");
      return;
    }
    toast.success("Đã thêm nội dung");
    setContentDlg(null);
    await load();
  }

  function moveModule(m: ModuleRow, dir: -1 | 1) {
    const idx = modules.findIndex((x) => x.id === m.id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= modules.length) return;
    const other = modules[next];
    void (async () => {
      await updateModule(m, { order: other.order });
      await updateModule(other, { order: m.order });
    })();
  }

  function moveLesson(mod: ModuleRow, le: LessonRow, dir: -1 | 1) {
    const les = mod.lessons;
    const idx = les.findIndex((x) => x.id === le.id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= les.length) return;
    const other = les[next];
    void (async () => {
      await updateLesson(le.id, { order: other.order });
      await updateLesson(other.id, { order: le.order });
    })();
  }

  if (loading && !course) {
    return <p className="text-muted-foreground text-sm">Đang tải…</p>;
  }

  if (!course) {
    return <p className="text-sm text-destructive">Không có dữ liệu khóa học.</p>;
  }

  const title = String(course.title ?? "");

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Thông tin khóa học (Edu V2)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            action={(fd) => void saveCourseMeta(fd)}
          >
            <div className="md:col-span-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                name="title"
                defaultValue={title}
                required
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={String(course.description ?? "")}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Danh mục (text)</Label>
              <Input
                id="category"
                name="category"
                defaultValue={String(course.category ?? "")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="level">Cấp độ</Label>
              <select
                id="level"
                name="level"
                defaultValue={String(course.level ?? "beginner")}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </div>
            <div>
              <Label htmlFor="duration_hours">Thoi luong (gio)</Label>
              <Input
                id="duration_hours"
                name="duration_hours"
                type="number"
                min={0}
                defaultValue={Number(course.duration_hours ?? 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="language">Ngôn ngữ</Label>
              <Input
                id="language"
                name="language"
                defaultValue={String(course.language ?? "vi")}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                name="thumbnail_url"
                defaultValue={String(course.thumbnail_url ?? "")}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="is_published"
                name="is_published"
                type="checkbox"
                defaultChecked={course.is_published === true}
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="is_published" className="font-normal">
                Xuất bản (học sinh có thể xem catalog)
              </Label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Lưu thông tin khóa học</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Chương & bài học</h2>
        <Button type="button" onClick={() => void addModule()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm chương
        </Button>
      </div>

      <div className="space-y-3">
        {modules.map((m, mi) => (
          <Card key={m.id} className="overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 text-left"
              onClick={() =>
                setOpenMod((s) => ({ ...s, [m.id]: !s[m.id] }))
              }
            >
              {openMod[m.id] ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium">{m.title}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                #{m.order}
              </Badge>
            </button>
            {openMod[m.id] ? (
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={mi === 0}
                    onClick={() => moveModule(m, -1)}
                  >
                    Lên
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={mi === modules.length - 1}
                    onClick={() => moveModule(m, 1)}
                  >
                    Xuống
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void deleteModule(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label>Tên chương</Label>
                    <Input
                      className="mt-1"
                      defaultValue={m.title}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== m.title) void updateModule(m, { title: v });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Mô tả</Label>
                    <Input
                      className="mt-1"
                      defaultValue={m.description ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (m.description ?? ""))
                          void updateModule(m, { description: v || null });
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Bài học</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void addLesson(m.id)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Thêm bài
                  </Button>
                </div>
                <ul className="space-y-3">
                  {m.lessons.map((le, li) => (
                    <li
                      key={le.id}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={li === 0}
                          onClick={() => moveLesson(m, le, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={li === m.lessons.length - 1}
                          onClick={() => moveLesson(m, le, 1)}
                        >
                          Down
                        </Button>
                        <Input
                          className="max-w-xs"
                          defaultValue={le.title}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== le.title)
                              void updateLesson(le.id, { title: v });
                          }}
                        />
                        <Select
                          value={le.lesson_type}
                          onValueChange={(v) =>
                            void updateLesson(le.id, { lesson_type: v })
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LESSON_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => void deleteLesson(le.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                          Nội dung (blocks)
                        </p>
                        <ul className="space-1 text-sm">
                          {le.contents.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1"
                            >
                              <span>
                                <Badge variant="secondary" className="mr-2">
                                  {c.content_type}
                                </Badge>
                                {String(
                                  (c.content_data as { title?: string })?.title ??
                                    c.id.slice(0, 8)
                                )}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-destructive"
                                onClick={() =>
                                  void deleteContent(le.id, c.id)
                                }
                              >
                                Xóa
                              </Button>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {CONTENT_TYPES.map((t) => (
                            <Button
                              key={t}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setContentDlg({ lessonId: le.id, type: t })
                              }
                            >
                              + {t}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      <Dialog open={!!contentDlg} onOpenChange={() => setContentDlg(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm nội dung: {contentDlg?.type}</DialogTitle>
          </DialogHeader>
          {contentDlg?.type === "video" ? (
            <div className="space-y-3">
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  className="mt-1"
                  value={contentForm.videoTitle}
                  onChange={(e) =>
                    setContentForm((s) => ({ ...s, videoTitle: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  className="mt-1"
                  value={contentForm.videoUrl}
                  onChange={(e) =>
                    setContentForm((s) => ({ ...s, videoUrl: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {contentDlg?.type === "text" ? (
            <div>
              <Label>Markdown / text</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={8}
                value={contentForm.textBody}
                onChange={(e) =>
                  setContentForm((s) => ({ ...s, textBody: e.target.value }))
                }
              />
            </div>
          ) : null}
          {contentDlg?.type === "code_editor" ? (
            <div className="space-y-3">
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  className="mt-1"
                  value={contentForm.codeTitle}
                  onChange={(e) =>
                    setContentForm((s) => ({ ...s, codeTitle: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Ngôn ngữ</Label>
                <Input
                  className="mt-1"
                  value={contentForm.language}
                  onChange={(e) =>
                    setContentForm((s) => ({ ...s, language: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Starter code</Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  rows={6}
                  value={contentForm.starter_code}
                  onChange={(e) =>
                    setContentForm((s) => ({
                      ...s,
                      starter_code: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}
          {contentDlg?.type === "quiz" ? (
            <div className="space-y-3">
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  className="mt-1"
                  value={contentForm.quizTitle}
                  onChange={(e) =>
                    setContentForm((s) => ({ ...s, quizTitle: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>JSON (passing_score, questions…)</Label>
                <Textarea
                  className="mt-1 font-mono text-xs"
                  rows={10}
                  value={contentForm.quizJson}
                  onChange={(e) =>
                    setContentForm((s) => ({ ...s, quizJson: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {contentDlg?.type === "resource" ? (
            <div className="space-y-3">
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  className="mt-1"
                  value={contentForm.resourceTitle}
                  onChange={(e) =>
                    setContentForm((s) => ({
                      ...s,
                      resourceTitle: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>File URL</Label>
                <Input
                  className="mt-1"
                  value={contentForm.resourceUrl}
                  onChange={(e) =>
                    setContentForm((s) => ({
                      ...s,
                      resourceUrl: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContentDlg(null)}>
              Huy
            </Button>
            <Button type="button" onClick={() => void submitContent()}>
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
