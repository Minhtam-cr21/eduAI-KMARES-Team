"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  published: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
};

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const editing = courses.find((c) => c.id === editId);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    for (const c of courses) {
      const cat = c.category?.trim();
      if (cat) s.add(cat);
    }
    return Array.from(s).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (q) {
        const inTitle = c.title.toLowerCase().includes(q);
        const inDesc = (c.description ?? "").toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }
      if (statusFilter !== "all" && (c.status ?? "") !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "all" && c.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [courses, search, statusFilter, categoryFilter]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Quản lý tất cả khóa học của bạn.
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tạo khóa học mới
        </Button>
      </div>

      {courses.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="course-search">Tìm kiếm</Label>
            <Input
              id="course-search"
              placeholder="Tên hoặc mô tả…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full min-w-[140px] space-y-1.5 sm:w-40">
            <Label>Trạng thái</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="published">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-[140px] space-y-1.5 sm:w-44">
            <Label>Danh mục</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có khóa học.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Tên khóa</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Bài học</TableHead>
                <TableHead className="text-right tabular-nums">Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Không có khóa học khớp bộ lọc.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredCourses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium text-foreground">{c.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.description ?? "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {c.category || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold capitalize",
                        STATUS_BADGE[c.status ?? ""] ?? ""
                      )}
                    >
                      {c.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.lesson_count}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {new Date(c.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Link
                        href={`/teacher/courses/${c.id}/lessons`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                      >
                        Bài học
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo khóa học</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Tiêu đề</Label>
              <Input id="c-title" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Mô tả</Label>
              <Textarea id="c-desc" name="description" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Loại</Label>
              <select
                id="c-type"
                name="course_type"
                required
                defaultValue="skill"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="skill">Kỹ năng</option>
                <option value="role">Vai trò</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cat">Danh mục</Label>
              <Input id="c-cat" name="category" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-thumb">Thumbnail URL (tuỳ chọn)</Label>
              <Input id="c-thumb" name="thumbnail_url" type="url" />
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

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa khóa học</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={(e) => void submitEdit(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-title">Tiêu đề</Label>
                <Input id="e-title" name="title" required defaultValue={editing.title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-desc">Mô tả</Label>
                <Textarea id="e-desc" name="description" rows={3} defaultValue={editing.description ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-type">Loại</Label>
                <select
                  id="e-type"
                  name="course_type"
                  required
                  defaultValue={editing.course_type}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="skill">Kỹ năng</option>
                  <option value="role">Vai trò</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-cat">Danh mục</Label>
                <Input id="e-cat" name="category" required defaultValue={editing.category} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-thumb">Thumbnail URL</Label>
                <Input id="e-thumb" name="thumbnail_url" type="url" defaultValue={editing.thumbnail_url ?? ""} placeholder="https://..." />
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa khóa học?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Chỉ xóa được khi không có bài học đã xuất bản và không có học sinh gắn lộ trình qua bài học của khóa.
          </p>
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
