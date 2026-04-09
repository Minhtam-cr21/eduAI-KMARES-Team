"use client";

import { Button, buttonVariants } from "@/components/ui/button";
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
import type { TeacherCourseRow } from "@/lib/teacher/courses-with-counts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = { initialCourses: TeacherCourseRow[] };

export function TeacherCoursesManager({ initialCourses }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const editing = courses.find((c) => c.id === editId);

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const body = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        course_type: fd.get("course_type") as "skill" | "role",
        category: String(fd.get("category") ?? "").trim(),
        thumbnail_url: String(fd.get("thumbnail_url") ?? "").trim() || null,
      };
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được");
        return;
      }
      toast.success("Đã tạo khóa học");
      setCreateOpen(false);
      e.currentTarget.reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editId) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        course_type: fd.get("course_type") as "skill" | "role",
        category: String(fd.get("category") ?? "").trim(),
        thumbnail_url: String(fd.get("thumbnail_url") ?? "").trim() || null,
      };
      const res = await fetch(`/api/courses/${editId}`, {
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
      setEditId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${deleteId}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không xóa được");
        return;
      }
      toast.success("Đã xóa khóa học");
      setDeleteId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Khóa học của bạn (mọi trạng thái).
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Tạo khóa học mới
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Bài học</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Chưa có khóa học.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {c.description ?? "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.lesson_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Link
                        href={`/teacher/courses/${c.id}/lessons`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        Xem bài học
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditId(c.id)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(c.id)}
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
            <DialogTitle>Tạo khóa học</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-3">
            <div>
              <Label htmlFor="c-title">Tiêu đề</Label>
              <Input id="c-title" name="title" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="c-desc">Mô tả</Label>
              <Textarea id="c-desc" name="description" className="mt-1" rows={3} />
            </div>
            <div>
              <Label htmlFor="c-type">Loại</Label>
              <select
                id="c-type"
                name="course_type"
                required
                defaultValue="skill"
                className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="skill">Kỹ năng</option>
                <option value="role">Vai trò</option>
              </select>
            </div>
            <div>
              <Label htmlFor="c-cat">Danh mục</Label>
              <Input id="c-cat" name="category" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="c-thumb">Thumbnail URL (tuỳ chọn)</Label>
              <Input id="c-thumb" name="thumbnail_url" type="url" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={loading}>
                Tạo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa khóa học</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={(e) => void submitEdit(e)} className="space-y-3">
              <div>
                <Label htmlFor="e-title">Tiêu đề</Label>
                <Input
                  id="e-title"
                  name="title"
                  required
                  className="mt-1"
                  defaultValue={editing.title}
                />
              </div>
              <div>
                <Label htmlFor="e-desc">Mô tả</Label>
                <Textarea
                  id="e-desc"
                  name="description"
                  className="mt-1"
                  rows={3}
                  defaultValue={editing.description ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="e-type">Loại</Label>
                <select
                  id="e-type"
                  name="course_type"
                  required
                  defaultValue={editing.course_type}
                  className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="skill">Kỹ năng</option>
                  <option value="role">Vai trò</option>
                </select>
              </div>
              <div>
                <Label htmlFor="e-cat">Danh mục</Label>
                <Input
                  id="e-cat"
                  name="category"
                  required
                  className="mt-1"
                  defaultValue={editing.category}
                />
              </div>
              <div>
                <Label htmlFor="e-thumb">Thumbnail URL</Label>
                <Input
                  id="e-thumb"
                  name="thumbnail_url"
                  type="url"
                  className="mt-1"
                  defaultValue={editing.thumbnail_url ?? ""}
                  placeholder="https://..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>
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
            <DialogTitle>Xóa khóa học?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Chỉ xóa được khi không có bài học đã xuất bản và không có học sinh gắn lộ
            trình qua bài học của khóa.
          </p>
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
