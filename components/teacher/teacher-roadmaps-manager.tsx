"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type TeacherRoadmapRow = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  is_public: boolean;
  tags: string[] | null;
  created_at: string;
};

type Props = { initialRoadmaps: TeacherRoadmapRow[] };

export function TeacherRoadmapsManager({ initialRoadmaps }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRoadmaps);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<TeacherRoadmapRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows(initialRoadmaps);
  }, [initialRoadmaps]);

  async function reload() {
    const res = await fetch("/api/teacher/roadmaps");
    if (!res.ok) return;
    const data = (await res.json()) as TeacherRoadmapRow[];
    setRows(Array.isArray(data) ? data : []);
  }

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const tagsRaw = String(fd.get("tags") ?? "").trim();
      const tags = tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : null;
      const body = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        content: String(fd.get("content") ?? "").trim() || null,
        image_url: String(fd.get("image_url") ?? "").trim() || null,
        is_public: fd.get("is_public") === "on",
        tags,
      };
      const res = await fetch("/api/teacher/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được");
        return;
      }
      toast.success("Đã tạo roadmap");
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
    if (!editRow) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const tagsRaw = String(fd.get("tags") ?? "").trim();
      const tags = tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : null;
      const body = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        content: String(fd.get("content") ?? "").trim() || null,
        image_url: String(fd.get("image_url") ?? "").trim() || null,
        is_public: fd.get("is_public") === "on",
        tags,
      };
      const res = await fetch(`/api/teacher/roadmaps/${editRow.id}`, {
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
      setEditRow(null);
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
      const res = await fetch(`/api/teacher/roadmaps/${deleteId}`, { method: "DELETE" });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Roadmap công khai hiển thị tại <Link href="/roadmaps" className="text-primary underline">/roadmaps</Link>.
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Thêm roadmap
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có roadmap nào.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-foreground">{r.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{r.description ?? "—"}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="outline" className="text-xs">
                    {r.is_public ? "Công khai" : "Riêng tư"}
                  </Badge>
                  {(r.tags ?? []).slice(0, 6).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/roadmaps/${r.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Xem
                </Link>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditRow(r)}>
                  Sửa
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Roadmap mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nr-title">Tiêu đề</Label>
              <Input id="nr-title" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-desc">Mô tả ngắn</Label>
              <Textarea id="nr-desc" name="description" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-content">Nội dung (markdown / JSON)</Label>
              <Textarea id="nr-content" name="content" rows={6} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-img">Ảnh (URL)</Label>
              <Input id="nr-img" name="image_url" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-tags">Tags (phân cách bằng dấu phẩy)</Label>
              <Input id="nr-tags" name="tags" placeholder="python, backend, …" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="nr-pub" name="is_public" value="on" defaultChecked className="border-input h-4 w-4 rounded" />
              <Label htmlFor="nr-pub" className="cursor-pointer text-sm font-normal">
                Công khai
              </Label>
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

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa roadmap</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <form onSubmit={(e) => void submitEdit(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="er-title">Tiêu đề</Label>
                <Input id="er-title" name="title" required defaultValue={editRow.title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-desc">Mô tả ngắn</Label>
                <Textarea id="er-desc" name="description" rows={2} defaultValue={editRow.description ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-content">Nội dung</Label>
                <Textarea id="er-content" name="content" rows={6} defaultValue={editRow.content ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-img">Ảnh (URL)</Label>
                <Input id="er-img" name="image_url" type="url" defaultValue={editRow.image_url ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-tags">Tags</Label>
                <Input id="er-tags" name="tags" defaultValue={(editRow.tags ?? []).join(", ")} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="er-pub"
                  name="is_public"
                  value="on"
                  defaultChecked={editRow.is_public}
                  className="border-input h-4 w-4 rounded"
                />
                <Label htmlFor="er-pub" className="cursor-pointer text-sm font-normal">
                  Công khai
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
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
            <DialogTitle>Xóa roadmap?</DialogTitle>
          </DialogHeader>
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
