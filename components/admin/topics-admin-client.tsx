"use client";

import {
  createTopicAction,
  deleteTopicAction,
  setTopicPublishedAction,
  updateTopicAction,
} from "@/lib/actions/topics";
import { topicFormSchema, type TopicFormValues } from "@/lib/validations/topic";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";

export type TopicRow = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
};

type Props = {
  topics: TopicRow[];
};

/** Chuẩn hoá giá trị trước khi gửi server action (tránh undefined / kiểu lệch). */
function normalizeTopicFormValues(values: TopicFormValues): TopicFormValues {
  const n = Number(values.order_index);
  return {
    title: String(values.title ?? "").trim(),
    description:
      values.description == null ? "" : String(values.description),
    order_index: Number.isFinite(n) ? Math.trunc(n) : 0,
    is_published: Boolean(values.is_published),
  };
}

export function TopicsAdminClient({ topics }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TopicRow | null>(null);
  const [syncing, setSyncing] = useState(false);

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema) as Resolver<TopicFormValues>,
    defaultValues: {
      title: "",
      description: "",
      order_index: 0,
      is_published: false,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      form.reset({
        title: editing.title,
        description: editing.description ?? "",
        order_index: editing.order_index,
        is_published: editing.is_published,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        order_index:
          topics.length > 0
            ? Math.max(...topics.map((t) => t.order_index)) + 1
            : 0,
        is_published: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tránh lặp vô hạn khi `form` đổi reference
  }, [dialogOpen, editing, topics]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: TopicRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function onSubmit(values: TopicFormValues) {
    const normalized = normalizeTopicFormValues(values);

    if (editing) {
      const id = String(editing.id);
      const res = await updateTopicAction({
        id,
        title: normalized.title,
        description: normalized.description,
        order_index: normalized.order_index,
        is_published: normalized.is_published,
      });
      if (!res.ok) {
        toast.error("Không lưu được chủ đề", {
          description: res.error,
        });
        return;
      }
      toast.success("Đã cập nhật chủ đề.");
    } else {
      const res = await createTopicAction(normalized);
      if (!res.ok) {
        toast.error("Không tạo được chủ đề", {
          description: res.error,
        });
        return;
      }
      toast.success("Đã thêm chủ đề.");
    }
    setDialogOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(row: TopicRow) {
    if (!window.confirm(`Xóa chủ đề “${row.title}”?`)) return;
    const id = String(row.id);
    const res = await deleteTopicAction(id);
    if (!res.ok) {
      toast.error("Không xóa được chủ đề", { description: res.error });
      return;
    }
    toast.success("Đã xóa chủ đề.");
    router.refresh();
  }

  async function handleSyncLearningPaths() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-learning-paths", {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error("Đồng bộ thất bại", {
          description: data.error ?? res.statusText,
        });
        return;
      }
      toast.success(data.message ?? "Đã đồng bộ lộ trình.");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleTogglePublish(row: TopicRow) {
    const next = !row.is_published;
    const res = await setTopicPublishedAction(String(row.id), next);
    if (!res.ok) {
      toast.error("Không cập nhật trạng thái publish", {
        description: res.error,
      });
      return;
    }
    toast.success(next ? "Đã publish." : "Đã gỡ publish.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Quản lý chủ đề
          </h1>
          <p className="text-muted-foreground text-sm">
            Thêm, sửa, publish chủ đề (chỉ admin).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={syncing}
            onClick={() => void handleSyncLearningPaths()}
          >
            {syncing ? "Đang đồng bộ…" : "Đồng bộ lộ trình"}
          </Button>
          <Button type="button" onClick={openCreate}>
            Thêm chủ đề mới
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Tên chủ đề</th>
              <th className="px-4 py-3 font-medium">Mô tả</th>
              <th className="px-4 py-3 font-medium">Thứ tự</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Bài học</th>
              <th className="px-4 py-3 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {topics.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  Chưa có chủ đề nào.
                </td>
              </tr>
            ) : (
              topics.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                    {row.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.order_index}</td>
                  <td className="px-4 py-3">
                    {row.is_published ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Đã publish
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                        Nháp
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/topics/${row.id}/lessons`}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Xem bài học
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTogglePublish(row)}
                      >
                        {row.is_published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(row)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-sm">
        <Link href="/dashboard" className="underline underline-offset-4">
          ← Về dashboard
        </Link>
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa chủ đề" : "Thêm chủ đề mới"}
            </DialogTitle>
            <DialogDescription>
              Điền thông tin chủ đề. Thứ tự nhỏ hơn hiển thị trước (tuỳ UI sau
              này).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="topic-title">Tiêu đề</Label>
              <Input id="topic-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-desc">Mô tả</Label>
              <Textarea
                id="topic-desc"
                rows={3}
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-order">Thứ tự (số nguyên)</Label>
              <Input
                id="topic-order"
                type="number"
                {...form.register("order_index")}
              />
              {form.formState.errors.order_index && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.order_index.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="is_published"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                )}
              />
              <Label className="font-normal">Publish ngay</Label>
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
