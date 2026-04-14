"use client";

import { AICourseGeneratorDialog } from "@/components/teacher/ai-course-generator-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { BookOpen, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CatalogCategoryRow = { id: string; name: string; slug: string };

type Props = { initialCourses: TeacherCourseRow[] };

function formatVnd(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function linesFromFd(fd: FormData, key: string): string[] {
  return String(fd.get(key) ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function levelLabel(v: string | null | undefined) {
  switch (v) {
    case "intermediate":
      return "Trung cấp";
    case "advanced":
      return "Nâng cao";
    case "all_levels":
      return "Mọi cấp";
    default:
      return "Cơ bản";
  }
}

export function TeacherCoursesManager({ initialCourses }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [catalogCategories, setCatalogCategories] = useState<
    CatalogCategoryRow[]
  >([]);

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/course-categories");
        const j = (await res.json()) as {
          data?: CatalogCategoryRow[];
          error?: string;
        };
        if (!res.ok || !j.data) return;
        if (!cancelled) setCatalogCategories(j.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const editing = courses.find((c) => c.id === editId);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (q) {
        const inTitle = c.title.toLowerCase().includes(q);
        const inDesc = (c.description ?? "").toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }
      if (visibilityFilter === "published" && c.is_published === false) {
        return false;
      }
      if (visibilityFilter === "draft" && c.is_published !== false) {
        return false;
      }
      if (
        categoryFilter !== "all" &&
        c.catalog_category?.slug !== categoryFilter
      ) {
        return false;
      }
      return true;
    });
  }, [courses, search, visibilityFilter, categoryFilter]);

  function buildExtendedBody(fd: FormData) {
    const categoryId = String(fd.get("category_id") ?? "").trim();
    const catMeta = catalogCategories.find((x) => x.id === categoryId);
    const categoryName =
      catMeta?.name ?? String(fd.get("category_fallback") ?? "").trim();
    if (!categoryName) {
      throw new Error("Chọn danh mục catalog.");
    }

    const objectives = linesFromFd(fd, "objectives");
    const whatYouLearn = linesFromFd(fd, "what_you_will_learn");
    const requirements = linesFromFd(fd, "requirements");
    const priceRaw = String(fd.get("price") ?? "").trim();
    const durRaw = String(fd.get("duration_hours") ?? "").trim();
    const faqRaw = String(fd.get("faq_json") ?? "").trim();
    let faq: unknown = null;
    if (faqRaw) {
      try {
        faq = JSON.parse(faqRaw) as unknown;
      } catch {
        throw new Error("Invalid FAQ JSON.");
      }
    }

    return {
      category: categoryName,
      category_id: categoryId || null,
      price: priceRaw === "" ? 0 : Number(priceRaw),
      duration_hours: durRaw === "" ? null : parseInt(durRaw, 10),
      level: String(fd.get("level") ?? "beginner") as
        | "beginner"
        | "intermediate"
        | "advanced"
        | "all_levels",
      objectives: objectives.length ? objectives : null,
      target_audience:
        String(fd.get("target_audience") ?? "").trim() || null,
      recommendations:
        String(fd.get("recommendations") ?? "").trim() || null,
      what_you_will_learn: whatYouLearn.length ? whatYouLearn : null,
      requirements: requirements.length ? requirements : null,
      image_url: String(fd.get("image_url") ?? "").trim() || null,
      promo_video_url:
        String(fd.get("promo_video_url") ?? "").trim() || null,
      content: String(fd.get("content") ?? "").trim() || null,
      faq,
    };
  }

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      let ext: ReturnType<typeof buildExtendedBody>;
      try {
        ext = buildExtendedBody(fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid data");
        return;
      }
      const body = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        course_type: fd.get("course_type") as "skill" | "role",
        thumbnail_url: String(fd.get("thumbnail_url") ?? "").trim() || null,
        ...ext,
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
      let ext: ReturnType<typeof buildExtendedBody>;
      try {
        ext = buildExtendedBody(fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid data");
        return;
      }
      const body: Record<string, unknown> = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        course_type: fd.get("course_type") as "skill" | "role",
        thumbnail_url: String(fd.get("thumbnail_url") ?? "").trim() || null,
        is_published: fd.get("is_published") === "on",
        ...ext,
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

  const categoryFilterItems = useMemo(
    () => catalogCategories.filter((c) => c.slug !== "all"),
    [catalogCategories]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Quản lý tất cả khóa học của bạn.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAiDialogOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Tạo khóa học b��ng AI
          </Button>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tạo khóa học mới
          </Button>
        </div>
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
            <Label>Hiển thị</Label>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="published">Đang xuất bản</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-[160px] space-y-1.5 sm:w-48">
            <Label>Danh mục (catalog)</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {categoryFilterItems.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    {cat.name}
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
        <Card className="overflow-x-auto border-border/60 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Tên khóa</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead className="text-right">Giá</TableHead>
                <TableHead className="text-right">Giờ</TableHead>
                <TableHead>Cấp độ</TableHead>
                <TableHead>Catalog / AI</TableHead>
                <TableHead className="text-right">Bài học</TableHead>
                <TableHead className="text-right tabular-nums">Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground"
                  >
                    Không có khóa học khớp bộ lọc.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredCourses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="max-w-[220px]">
                      <p className="font-medium text-foreground">{c.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.description ?? "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.catalog_category?.name ?? c.category ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatVnd(c.price)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {c.duration_hours ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {levelLabel(c.level)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-semibold",
                          c.is_published === false
                            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                            : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                        )}
                      >
                        {c.is_published === false ? "Nháp" : "Xuất bản"}
                      </Badge>
                      {c.ai_generated ? (
                        <Badge variant="secondary" className="gap-0.5 text-xs">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </Badge>
                      ) : null}
                    </div>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-type">Loại</Label>
                <select
                  id="c-type"
                  name="course_type"
                  required
                  defaultValue="skill"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="skill">Skill</option>
                  <option value="role">Vai trò</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-level">Cấp độ</Label>
                <select
                  id="c-level"
                  name="level"
                  defaultValue="beginner"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="beginner">Cơ bản</option>
                  <option value="intermediate">Trung cấp</option>
                  <option value="advanced">Nâng cao</option>
                  <option value="all_levels">Mọi cấp</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-catid">Danh mục catalog</Label>
              <select
                id="c-catid"
                name="category_id"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                defaultValue=""
              >
                <option value="" disabled>
                  Chọn danh mục
                </option>
                {catalogCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name="category_fallback" value="" readOnly />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-price">Giá (VND)</Label>
                <Input
                  id="c-price"
                  name="price"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-dur">Duration (hours)</Label>
                <Input
                  id="c-dur"
                  name="duration_hours"
                  type="number"
                  min={0}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-thumb">Thumbnail URL</Label>
              <Input id="c-thumb" name="thumbnail_url" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-img">Course image URL</Label>
              <Input id="c-img" name="image_url" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-promo">Video giới thiệu (URL)</Label>
              <Input id="c-promo" name="promo_video_url" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-obj">Objectives (one per line)</Label>
              <Textarea id="c-obj" name="objectives" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-aud">Đối tượng học viên</Label>
              <Textarea id="c-aud" name="target_audience" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-rec">Khuyến nghị</Label>
              <Textarea id="c-rec" name="recommendations" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-wyl">What you will learn (one per line)</Label>
              <Textarea id="c-wyl" name="what_you_will_learn" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-req">Requirements (one per line)</Label>
              <Textarea id="c-req" name="requirements" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-content">Nội dung chi tiết (tùy chọn)</Label>
              <Textarea id="c-content" name="content" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-faq">FAQ (JSON, tùy chọn)</Label>
              <Textarea
                id="c-faq"
                name="faq_json"
                rows={3}
                placeholder='[{"q":"...","a":"..."}]'
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Tạo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AICourseGeneratorDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onSaved={() => router.refresh()}
      />

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sửa khóa học</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={(e) => void submitEdit(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-title">Tiêu đề</Label>
                <Input
                  id="e-title"
                  name="title"
                  required
                  defaultValue={editing.title}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-desc">Mô tả</Label>
                <Textarea
                  id="e-desc"
                  name="description"
                  rows={3}
                  defaultValue={editing.description ?? ""}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="e-type">Loại</Label>
                  <select
                    id="e-type"
                    name="course_type"
                    required
                    defaultValue={editing.course_type}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="skill">Skill</option>
                    <option value="role">Vai trò</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-level">Cấp độ</Label>
                  <select
                    id="e-level"
                    name="level"
                    defaultValue={editing.level ?? "beginner"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                    <option value="all_levels">Mọi cấp</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-catid">Danh mục catalog</Label>
                <select
                  id="e-catid"
                  name="category_id"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  defaultValue={
                    editing.category_id ??
                    catalogCategories.find((x) => x.slug === "all")?.id ??
                    ""
                  }
                >
                  {catalogCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="e-price">Giá (VND)</Label>
                  <Input
                    id="e-price"
                    name="price"
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={editing.price ?? 0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-dur">Duration (hours)</Label>
                  <Input
                    id="e-dur"
                    name="duration_hours"
                    type="number"
                    min={0}
                    defaultValue={editing.duration_hours ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-thumb">Thumbnail URL</Label>
                <Input
                  id="e-thumb"
                  name="thumbnail_url"
                  type="url"
                  defaultValue={editing.thumbnail_url ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-img">Course image URL</Label>
                <Input
                  id="e-img"
                  name="image_url"
                  type="url"
                  defaultValue={editing.image_url ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-promo">Video giới thiệu</Label>
                <Input
                  id="e-promo"
                  name="promo_video_url"
                  type="url"
                  defaultValue={editing.promo_video_url ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-obj">Objectives (one per line)</Label>
                <Textarea
                  id="e-obj"
                  name="objectives"
                  rows={3}
                  defaultValue={(editing.objectives ?? []).join("\n")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-aud">Đối tượng</Label>
                <Textarea
                  id="e-aud"
                  name="target_audience"
                  rows={2}
                  defaultValue={editing.target_audience ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-rec">Khuyến nghị</Label>
                <Textarea
                  id="e-rec"
                  name="recommendations"
                  rows={2}
                  defaultValue={editing.recommendations ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-wyl">What you will learn</Label>
                <Textarea
                  id="e-wyl"
                  name="what_you_will_learn"
                  rows={3}
                  defaultValue={(editing.what_you_will_learn ?? []).join("\n")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-req">Requirements</Label>
                <Textarea
                  id="e-req"
                  name="requirements"
                  rows={2}
                  defaultValue={(editing.requirements ?? []).join("\n")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-content">Nội dung chi tiết</Label>
                <Textarea
                  id="e-content"
                  name="content"
                  rows={4}
                  defaultValue={editing.content ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-faq">FAQ (JSON)</Label>
                <Textarea
                  id="e-faq"
                  name="faq_json"
                  rows={3}
                  defaultValue={
                    editing.faq != null
                      ? JSON.stringify(editing.faq, null, 2)
                      : ""
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="e-pub"
                  name="is_published"
                  value="on"
                  defaultChecked={editing.is_published !== false}
                  className="border-input h-4 w-4 rounded"
                />
                <Label
                  htmlFor="e-pub"
                  className="cursor-pointer text-sm font-normal"
                >
                  Xuất bản (hiển thị trong catalog)
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditId(null)}
                >
                  Close</Button>
                <Button type="submit" disabled={loading}>
                  Save
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
          <p className="text-sm text-muted-foreground">
            You can only delete when there are no published lessons and no
            students tied to learning paths from this course.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
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
