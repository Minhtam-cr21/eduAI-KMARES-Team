"use client";

import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Lesson = {
  id: string;
  course_id: string | null;
  title: string;
  content: string | null;
  video_url: string | null;
  code_template: string | null;
  order_index: number | null;
  status: string | null;
  created_at: string;
};

type Props = {
  courseId: string;
  courseTitle: string;
  courseStatus: string | null;
  initialLessons: Lesson[];
};

export function TeacherLessonsManager({
  courseId,
  courseTitle,
  courseStatus,
  initialLessons,
}: Props) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [createOpen, setCreateOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  const canAddLesson = courseStatus === "published";

  async function reload() {
    const res = await fetch(`/api/teacher/courses/${courseId}/lessons`);
    if (!res.ok) return;
    const data = (await res.json()) as Lesson[];
    setLessons(Array.isArray(data) ? data : []);
  }

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canAddLesson) {
      toast.error("Chỉ thêm bài khi khóa đã được duyệt (published).");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const orderRaw = String(fd.get("order_index") ?? "").trim();
      const body = {
        course_id: courseId,
        title: String(fd.get("title") ?? "").trim(),
        content: String(fd.get("content") ?? "").trim() || null,
        video_url: String(fd.get("video_url") ?? "").trim() || null,
        code_template: String(fd.get("code_template") ?? "").trim() || null,
        order_index: orderRaw ? parseInt(orderRaw, 10) : 0,
      };
      const res = await fetch("/api/course-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không thêm được");
        return;
      }
      toast.success("Đã thêm bài học");
      setCreateOpen(false);
      e.currentTarget.reset();
      router.refresh();
      await reload();
    } finally {
      setLoading(false);
    }
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editLesson) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const orderRaw = String(fd.get("order_index") ?? "").trim();
      const body = {
        title: String(fd.get("title") ?? "").trim(),
        content: String(fd.get("content") ?? "").trim() || null,
        video_url: String(fd.get("video_url") ?? "").trim() || null,
        code_template: String(fd.get("code_template") ?? "").trim() || null,
        order_index: orderRaw ? parseInt(orderRaw, 10) : 0,
      };
      const res = await fetch(`/api/course-lessons/${editLesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không cập nhật được");
        return;
      }
      toast.success("Đã cập nhật");
      setEditLesson(null);
      router.refresh();
      await reload();
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/course-lessons/${deleteId}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không xóa được");
        return;
      }
      toast.success("Đã xóa");
      setDeleteId(null);
      router.refresh();
      await reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{courseTitle}</h1>
        <p className="text-muted-foreground text-sm">
          Trạng thái khóa: {courseStatus ?? "—"}
          {!canAddLesson ? (
            <span className="text-destructive">
              {" "}
              — Cần admin duyệt khóa (published) để thêm bài học mới.
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={!canAddLesson}
        >
          Thêm bài học mới
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thứ tự</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Chưa có bài học.
                </TableCell>
              </TableRow>
            ) : (
              lessons.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="tabular-nums">
                    {l.order_index ?? 0}
                  </TableCell>
                  <TableCell className="font-medium">{l.title}</TableCell>
                  <TableCell>{l.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditLesson(l)}
                        disabled={
                          l.status === "published" ||
                          (l.status !== "pending" && l.status !== "rejected")
                        }
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(l.id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm bài học</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-3">
            <div>
              <Label htmlFor="ltitle">Tiêu đề</Label>
              <Input id="ltitle" name="title" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lorder">Thứ tự</Label>
              <Input
                id="lorder"
                name="order_index"
                type="number"
                min={0}
                className="mt-1"
                defaultValue={0}
              />
            </div>
            <div>
              <Label htmlFor="lcontent">Nội dung</Label>
              <Textarea id="lcontent" name="content" className="mt-1" rows={4} />
            </div>
            <div>
              <Label htmlFor="lvideo">Video URL</Label>
              <Input id="lvideo" name="video_url" type="url" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lcode">Code template</Label>
              <Textarea id="lcode" name="code_template" className="mt-1" rows={4} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={loading || !canAddLesson}>
                Thêm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLesson} onOpenChange={(o) => !o && setEditLesson(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa bài học</DialogTitle>
          </DialogHeader>
          {editLesson ? (
            <form onSubmit={(e) => void submitEdit(e)} className="space-y-3">
              <div>
                <Label htmlFor="etitle">Tiêu đề</Label>
                <Input
                  id="etitle"
                  name="title"
                  required
                  className="mt-1"
                  defaultValue={editLesson.title}
                />
              </div>
              <div>
                <Label htmlFor="eorder">Thứ tự</Label>
                <Input
                  id="eorder"
                  name="order_index"
                  type="number"
                  min={0}
                  className="mt-1"
                  defaultValue={editLesson.order_index ?? 0}
                />
              </div>
              <div>
                <Label htmlFor="econtent">Nội dung</Label>
                <Textarea
                  id="econtent"
                  name="content"
                  className="mt-1"
                  rows={4}
                  defaultValue={editLesson.content ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="evideo">Video URL</Label>
                <Input
                  id="evideo"
                  name="video_url"
                  type="url"
                  className="mt-1"
                  defaultValue={editLesson.video_url ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="ecode">Code template</Label>
                <Textarea
                  id="ecode"
                  name="code_template"
                  className="mt-1"
                  rows={4}
                  defaultValue={editLesson.code_template ?? ""}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditLesson(null)}>
                  Đóng
                </Button>
                <Button type="submit" disabled={loading}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa bài học?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => void confirmDelete()}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
