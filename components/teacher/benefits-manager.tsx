"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type BenefitRow = {
  id?: string;
  icon: string | null;
  title: string;
  description: string | null;
  display_order: number;
};

type Props = { courseId: string };

export function BenefitsManager({ courseId }: Props) {
  const [rows, setRows] = useState<BenefitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/structure`);
      const j = (await res.json()) as {
        benefits?: BenefitRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tải quyền lợi");
        setRows([]);
        return;
      }
      const b = Array.isArray(j.benefits) ? j.benefits : [];
      setRows(
        b.map((x, i) => ({
          id: x.id,
          icon: x.icon ?? null,
          title: x.title ?? "",
          description: x.description ?? null,
          display_order: x.display_order ?? i,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const benefits = rows.map((r, i) => ({
        id: r.id,
        icon: r.icon?.trim() || null,
        title: r.title.trim(),
        description: r.description?.trim() || null,
        display_order: i,
      }));
      const res = await fetch(`/api/courses/${courseId}/structure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefits }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không lưu được");
        return;
      }
      toast.success("Đã lưu quyền lợi");
      await load();
      setEditingIndex(null);
    } finally {
      setSaving(false);
    }
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        icon: "check",
        title: "",
        description: null,
        display_order: prev.length,
      },
    ]);
    setEditingIndex(rows.length);
  }

  function removeAt(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
    setEditingIndex((e) => (e === i ? null : e != null && e > i ? e - 1 : e));
  }

  if (loading) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Đang tải…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Quyền lợi hiển thị trên trang khóa học (học viên).
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Thêm benefit
          </Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu quyền lợi"}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
            <Gift className="mb-2 h-10 w-10 opacity-40" />
            Chưa có benefit. Nhấn &quot;Thêm benefit&quot; để bắt đầu.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <Card key={r.id ?? `new-${i}`} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Gift className="text-primary h-4 w-4 shrink-0" />
                    Benefit {i + 1}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-8 w-8"
                      onClick={() => removeAt(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {editingIndex === i ? (
                  <div className="space-y-2 text-sm">
                    <div className="space-y-1">
                      <Label htmlFor={`icon-${i}`}>Icon (tên hoặc emoji)</Label>
                      <Input
                        id={`icon-${i}`}
                        value={r.icon ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, icon: e.target.value || null } : x
                            )
                          )
                        }
                        placeholder="check, star, …"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`title-${i}`}>Tiêu đề</Label>
                      <Input
                        id={`title-${i}`}
                        value={r.title}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`desc-${i}`}>Mô tả</Label>
                      <Textarea
                        id={`desc-${i}`}
                        rows={3}
                        value={r.description ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, j) =>
                              j === i
                                ? { ...x, description: e.target.value || null }
                                : x
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium leading-snug">{r.title || "—"}</p>
                    {r.description ? (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {r.description}
                      </p>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
