"use client";

import { CoursePreviewEditor } from "@/components/teacher/course-preview-editor";
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
import { Textarea } from "@/components/ui/textarea";
import type { AICourseDraft } from "@/lib/ai/ai-course-draft";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export function AICourseGeneratorDialog({ open, onOpenChange, onSaved }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [topic, setTopic] = useState("");
  const [titleHint, setTitleHint] = useState("");
  const [descriptionHint, setDescriptionHint] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [enrichContext, setEnrichContext] = useState(true);

  const [draft, setDraft] = useState<AICourseDraft | null>(null);
  const [sourceFile, setSourceFile] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep("form");
    setTopic("");
    setTitleHint("");
    setDescriptionHint("");
    setTextContent("");
    setFile(null);
    setEnrichContext(true);
    setDraft(null);
    setSourceFile(null);
  }, []);

  function handleClose(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const t = topic.trim();
    if (!t) {
      toast.error("Nhập chủ đề khóa học.");
      return;
    }
    if (file) {
      const n = file.name.toLowerCase();
      if (!n.endsWith(".pdf") && !n.endsWith(".txt")) {
        toast.error("Chỉ hỗ trợ PDF hoặc .txt.");
        return;
      }
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        topic: t,
        title: titleHint.trim() || null,
        description: descriptionHint.trim() || null,
        textContent: textContent.trim() || null,
        file_base64: null as string | null,
        file_name: null as string | null,
        enable_context_enrichment: enrichContext,
      };
      if (file) {
        body.file_base64 = await fileToBase64(file);
        body.file_name = file.name;
      }
      const res = await fetch("/api/ai/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        error?: string;
        draft?: AICourseDraft;
        source_file?: string | null;
        meta?: { used_fallback?: boolean };
      };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được bản thảo");
        return;
      }
      if (!j.draft?.lessons?.length) {
        toast.error("Phản hồi AI không hợp lệ");
        return;
      }
      setDraft(j.draft);
      setSourceFile(j.source_file ?? null);
      setStep("preview");
      if (j.meta?.used_fallback) {
        toast.message("Đã dùng bản mẫu — hãy chỉnh sửa trước khi xuất bản", {
          description: "AI tạm thời không khả dụng hoặc phản hồi không đọc được.",
        });
      } else {
        toast.success("Đã tạo bản xem trước");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Thiếu tiêu đề khóa học");
      return;
    }
    if (!draft.category.trim()) {
      toast.error("Thiếu danh mục");
      return;
    }
    if (draft.lessons.length === 0) {
      toast.error("Cần ít nhất một bài học");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/teacher/courses/from-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseData: {
            title: draft.title.trim(),
            description: draft.description.trim() || null,
            content: draft.content.trim() || draft.description.trim() || null,
            course_type: draft.course_type,
            category: draft.category.trim(),
            thumbnail_url: draft.thumbnail_url?.trim() || null,
          },
          lessonsData: draft.lessons.map((l) => ({
            title: l.title.trim(),
            content: l.content,
            video_url: l.video_url,
            code_template: l.code_template,
          })),
          source_file: sourceFile,
        }),
      });
      const j = (await res.json()) as { error?: string; course_id?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không lưu được");
        return;
      }
      toast.success("Đã xuất bản khóa học");
      handleClose(false);
      onSaved?.();
      router.refresh();
      if (j.course_id) {
        router.push(`/teacher/courses/${j.course_id}/lessons`);
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[95vh] max-w-[min(96rem,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96rem,calc(100vw-1.5rem))]">
        <DialogHeader className="border-b border-border/60 px-4 py-3 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {step === "preview" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-1 h-8 gap-1 px-2"
                disabled={loading || publishing}
                onClick={() => setStep("form")}
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            ) : null}
            <Sparkles className="text-primary h-5 w-5 shrink-0" />
            Tạo khóa học bằng AI
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form
            onSubmit={(e) => void handleGenerate(e)}
            className="flex max-h-[inherit] flex-1 flex-col overflow-hidden"
          >
            <div className="max-h-[min(70vh,720px)] flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Nhập chủ đề bắt buộc. Bạn có thể đính kèm PDF hoặc .txt (trích chữ được), hoặc dán nội dung
                tham khảo. Sau đó xem trước, chỉnh sửa và xuất bản — không cần admin duyệt.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-topic">Chủ đề *</Label>
                <Input
                  id="ai-gen-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ví dụ: Lập trình Python cơ bản cho người mới"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-title-hint">Gợi ý tiêu đề (tuỳ chọn)</Label>
                <Input
                  id="ai-gen-title-hint"
                  value={titleHint}
                  onChange={(e) => setTitleHint(e.target.value)}
                  placeholder="Để AI căn theo, hoặc bỏ trống"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-desc-hint">Ghi chú / mô tả thêm (tuỳ chọn)</Label>
                <Textarea
                  id="ai-gen-desc-hint"
                  value={descriptionHint}
                  onChange={(e) => setDescriptionHint(e.target.value)}
                  rows={2}
                  placeholder="Đối tượng, trọng tâm…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-file">File PDF hoặc .txt (tuỳ chọn)</Label>
                <Input
                  id="ai-gen-file"
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-paste">Nội dung văn bản tham khảo (tuỳ chọn)</Label>
                <Textarea
                  id="ai-gen-paste"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  placeholder="Dán nội dung tóm tắt, đề cương, hoặc tài liệu…"
                />
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/25 p-3">
                <input
                  type="checkbox"
                  id="ai-gen-enrich"
                  checked={enrichContext}
                  onChange={(e) => setEnrichContext(e.target.checked)}
                  className="border-input mt-0.5 h-4 w-4 shrink-0 rounded"
                />
                <Label htmlFor="ai-gen-enrich" className="cursor-pointer text-xs font-normal leading-snug">
                  Bổ sung ngữ cảnh chương trình từ kiến thức chung (không thay nội dung trong file đính kèm).
                </Label>
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 px-4 py-3 sm:px-6">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={loading} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                {loading ? "Đang gọi AI…" : "Tạo khóa học"}
              </Button>
            </DialogFooter>
          </form>
        ) : draft ? (
          <div className="flex max-h-[inherit] min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-3 sm:px-6">
              <CoursePreviewEditor value={draft} onChange={setDraft} disabled={publishing} />
            </div>
            <DialogFooter className="border-t border-border/60 px-4 py-3 sm:px-6">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={publishing}>
                Đóng
              </Button>
              <Button type="button" className="gap-1.5" disabled={publishing} onClick={() => void handlePublish()}>
                {publishing ? "Đang lưu…" : "Xuất bản khóa học"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
