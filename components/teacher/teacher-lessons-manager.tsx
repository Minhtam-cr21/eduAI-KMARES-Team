"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";
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

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  published: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{courseTitle}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Trạng thái khóa:</span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold capitalize",
              STATUS_BADGE[courseStatus ?? ""] ?? ""
            )}
          >
            {courseStatus ?? "—"}
          </Badge>
          {!canAddLesson && (
            <span className="text-xs text-destructive">
              — Cần admin duyệt khóa (published) để thêm bài học mới.
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={!canAddLesson}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Thêm bài học
        </Button>
      </div>

      {lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có bài học.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Thứ tự</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="tabular-nums font-medium">
                    {l.order_index ?? 0}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{l.title}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold capitalize",
                        STATUS_BADGE[l.status ?? ""] ?? ""
                      )}
                    >
                      {l.status ?? "—"}
                    </Badge>
                  </TableCell>
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm bài học</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ltitle">Tiêu đề</Label>
              <Input id="ltitle" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lorder">Thứ tự</Label>
              <Input id="lorder" name="order_index" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lcontent">Nội dung</Label>
              <Textarea id="lcontent" name="content" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lvideo">Video URL</Label>
              <Input id="lvideo" name="video_url" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lcode">Code template</Label>
              <Textarea id="lcode" name="code_template" rows={4} />
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

      {/* Edit Dialog */}
      <Dialog open={!!editLesson} onOpenChange={(o) => !o && setEditLesson(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa bài học</DialogTitle>
          </DialogHeader>
          {editLesson ? (
            <form onSubmit={(e) => void submitEdit(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="etitle">Tiêu đề</Label>
                <Input id="etitle" name="title" required defaultValue={editLesson.title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eorder">Thứ tự</Label>
                <Input id="eorder" name="order_index" type="number" min={0} defaultValue={editLesson.order_index ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="econtent">Nội dung</Label>
                <Textarea id="econtent" name="content" rows={4} defaultValue={editLesson.content ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evideo">Video URL</Label>
                <Input id="evideo" name="video_url" type="url" defaultValue={editLesson.video_url ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecode">Code template</Label>
                <Textarea id="ecode" name="code_template" rows={4} defaultValue={editLesson.code_template ?? ""} />
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa bài học?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" disabled={loading} onClick={() => void confirmDelete()}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
