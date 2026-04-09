"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const LANG_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
] as const;

const DIFF_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

const formSchema = z.object({
  title: z.string().min(1, "Bắt buộc"),
  description: z.string().min(1, "Bắt buộc"),
  language: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  initial_code: z.string().default(""),
  sample_input: z.string().default(""),
  sample_output: z.string().default(""),
  hint: z.string().default(""),
  is_published: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

type PQRow = {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  initial_code: string;
  sample_input: string;
  sample_output: string;
  hint: string;
  is_published: boolean;
  created_at: string;
};

async function parseJson(
  res: Response
): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    return (await res.json()) as { error?: string } & Record<string, unknown>;
  } catch {
    return {};
  }
}

export function PracticeQuestionsAdminClient() {
  const [items, setItems] = useState<PQRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PQRow | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/practice-questions");
      if (!res.ok) {
        const d = await parseJson(res);
        toast.error("Không tải được", {
          description: typeof d.error === "string" ? d.error : res.statusText,
        });
        setItems([]);
        return;
      }
      const data = (await res.json()) as PQRow[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      title: "",
      description: "",
      language: "python",
      difficulty: "easy",
      initial_code: "",
      sample_input: "",
      sample_output: "",
      hint: "",
      is_published: true,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      form.reset({
        title: editing.title,
        description: editing.description,
        language: editing.language,
        difficulty: editing.difficulty as "easy" | "medium" | "hard",
        initial_code: editing.initial_code ?? "",
        sample_input: editing.sample_input ?? "",
        sample_output: editing.sample_output ?? "",
        hint: editing.hint ?? "",
        is_published: editing.is_published,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        language: "python",
        difficulty: "easy",
        initial_code: "",
        sample_input: "",
        sample_output: "",
        hint: "",
        is_published: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: PQRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (editing) {
      const res = await fetch(`/api/admin/practice-questions/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = await parseJson(res);
      if (!res.ok) {
        toast.error("Không lưu được", {
          description: typeof d.error === "string" ? d.error : res.statusText,
        });
        return;
      }
      toast.success("Đã cập nhật câu hỏi.");
    } else {
      const res = await fetch("/api/admin/practice-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = await parseJson(res);
      if (!res.ok) {
        toast.error("Không tạo được", {
          description: typeof d.error === "string" ? d.error : res.statusText,
        });
        return;
      }
      toast.success("Đã thêm câu hỏi.");
    }
    setDialogOpen(false);
    setEditing(null);
    await loadList();
  }

  async function handleDelete(row: PQRow) {
    if (!window.confirm(`Xóa câu hỏi "${row.title}"?`)) return;
    const res = await fetch(`/api/admin/practice-questions/${row.id}`, {
      method: "DELETE",
    });
    const d = await parseJson(res);
    if (!res.ok) {
      toast.error("Không xóa được", {
        description: typeof d.error === "string" ? d.error : res.statusText,
      });
      return;
    }
    toast.success("Đã xóa.");
    await loadList();
  }

  const filtered =
    filter === "all" ? items : items.filter((i) => i.language === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link
              href="/admin/topics"
              className="text-primary underline-offset-4 hover:underline"
            >
              ← Admin
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Quản lý câu hỏi luyện tập
          </h1>
          <p className="text-muted-foreground text-sm">
            CRUD câu hỏi cho &quot;Phòng luyện code&quot;
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="all">Tất cả ngôn ngữ</option>
            {LANG_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <Button type="button" onClick={openCreate}>
            Thêm câu hỏi
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Tiêu đề</th>
                <th className="px-4 py-3 font-medium">Ngôn ngữ</th>
                <th className="px-4 py-3 font-medium">Độ khó</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    Chưa có câu hỏi nào.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const langLabel =
                    LANG_OPTIONS.find((o) => o.value === row.language)?.label ??
                    row.language;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{row.title}</td>
                      <td className="px-4 py-3">{langLabel}</td>
                      <td className="px-4 py-3 capitalize">{row.difficulty}</td>
                      <td className="px-4 py-3">
                        {row.is_published ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                            Published
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                            Nháp
                          </span>
                        )}
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
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(row)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa câu hỏi" : "Thêm câu hỏi luyện tập"}
            </DialogTitle>
            <DialogDescription>
              Mô tả hỗ trợ Markdown. Sau khi lưu, câu hỏi xuất hiện ở trang
              /practice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pq-title">Tiêu đề</Label>
              <Input id="pq-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pq-desc">Mô tả / đề bài (Markdown)</Label>
              <Textarea
                id="pq-desc"
                rows={4}
                className="font-mono text-sm"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select
                  value={form.watch("language")}
                  onValueChange={(v) => form.setValue("language", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANG_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Độ khó</Label>
                <Select
                  value={form.watch("difficulty")}
                  onValueChange={(v) =>
                    form.setValue(
                      "difficulty",
                      v as "easy" | "medium" | "hard"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFF_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pq-initial">Code mẫu ban đầu</Label>
              <Textarea
                id="pq-initial"
                rows={5}
                className="font-mono text-sm"
                {...form.register("initial_code")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pq-in">Sample input</Label>
                <Textarea
                  id="pq-in"
                  rows={3}
                  className="font-mono text-sm"
                  {...form.register("sample_input")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pq-out">Sample output</Label>
                <Textarea
                  id="pq-out"
                  rows={3}
                  className="font-mono text-sm"
                  {...form.register("sample_output")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pq-hint">Gợi ý (hint)</Label>
              <Textarea
                id="pq-hint"
                rows={2}
                className="font-mono text-sm"
                {...form.register("hint")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pq-pub"
                {...form.register("is_published")}
                className="size-4 rounded border"
              />
              <Label htmlFor="pq-pub" className="font-normal">
                Published (hiển thị cho học sinh)
              </Label>
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
