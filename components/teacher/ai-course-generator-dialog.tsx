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
import { normalizeCourseCategory } from "@/lib/constants/course-categories";
import { cn } from "@/lib/utils";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

type GenerateResponse = {
  error?: string;
  draft?: AICourseDraft;
  source_file?: string | null;
  meta?: { used_fallback?: boolean };
};

export function AICourseGeneratorDialog({ open, onOpenChange, onSaved }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [source, setSource] = useState<"text" | "pdf" | null>(null);
  const [topic, setTopic] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [enrichContext, setEnrichContext] = useState(false);

  const [draft, setDraft] = useState<AICourseDraft | null>(null);
  const [sourceFile, setSourceFile] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep("form");
    setSource(null);
    setTopic("");
    setCustomTitle("");
    setAdditionalNote("");
    setTextContent("");
    setPdfFile(null);
    setEnrichContext(false);
    setDraft(null);
    setSourceFile(null);
    setFormError(null);
  }, []);

  function handleClose(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!source) {
      toast.error(
        "Vui l\u00f2ng ch\u1ecdn ngu\u1ed3n n\u1ed9i dung"
      );
      return;
    }
    if (source === "text" && !textContent.trim() && !topic.trim()) {
      toast.error(
        "Vui l\u00f2ng nh\u1eadp ch\u1ee7 \u0111\u1ec1 ho\u1eb7c n\u1ed9i dung v\u0103n b\u1ea3n"
      );
      return;
    }
    if (source === "pdf" && !pdfFile) {
      toast.error("Vui l\u00f2ng ch\u1ecdn file PDF");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("topic", topic);
    if (source === "text") {
      formData.append("textContent", textContent);
    } else if (source === "pdf" && pdfFile) {
      formData.append("pdfFile", pdfFile);
    }
    if (additionalNote.trim()) formData.append("additionalNote", additionalNote.trim());
    if (customTitle.trim()) formData.append("customTitle", customTitle.trim());
    if (enrichContext) formData.append("enrichContext", "true");

    try {
      const res = await fetch("/api/ai/generate-course", {
        method: "POST",
        body: formData,
      });
      const raw = await res.text();
      let data: GenerateResponse = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as GenerateResponse;
        } catch {
          const msg =
            "Kh\u00f4ng th\u1ec3 t\u1ea1o kh\u00f3a h\u1ecdc, vui l\u00f2ng th\u1eed l\u1ea1i";
          toast.error(msg);
          setFormError(msg);
          return;
        }
      } else {
        const msg =
          "Kh\u00f4ng th\u1ec3 t\u1ea1o kh\u00f3a h\u1ecdc, vui l\u00f2ng th\u1eed l\u1ea1i";
        toast.error(msg);
        setFormError(msg);
        return;
      }

      if (!res.ok) {
        const errMsg =
          data.error ||
          "L\u1ed7i t\u1ea1o kh\u00f3a h\u1ecdc";
        toast.error(errMsg);
        setFormError(errMsg);
        return;
      }

      if (!data.draft?.lessons?.length) {
        const msg = "Ph\u1ea3n h\u1ed3i AI kh\u00f4ng h\u1ee3p l\u1ec7.";
        toast.error(msg);
        setFormError(msg);
        return;
      }

      setDraft(data.draft);
      setSourceFile(data.source_file ?? null);
      setStep("preview");
      if (data.meta?.used_fallback) {
        toast.message(
          "\u0110\u00e3 d\u00f9ng b\u1ea3n m\u1eabu \u2014 h\u00e3y ch\u1ec9nh s\u1eeda tr\u01b0\u1edbc khi xu\u1ea5t b\u1ea3n",
          {
            description:
              "AI kh\u00f4ng tr\u1ea3 v\u1ec1 \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng ho\u1eb7c API t\u1ea1m l\u1ed7i.",
          }
        );
      } else {
        toast.success("\u0110\u00e3 t\u1ea1o b\u1ea3n xem tr\u01b0\u1edbc");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Kh\u00f4ng th\u1ec3 t\u1ea1o kh\u00f3a h\u1ecdc, vui l\u00f2ng th\u1eed l\u1ea1i";
      toast.error(msg);
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Thi\u1ebfu ti\u00eau \u0111\u1ec1 kh\u00f3a h\u1ecdc");
      return;
    }
    if (!draft.category.trim()) {
      toast.error("Thi\u1ebfu danh m\u1ee5c");
      return;
    }
    if (draft.lessons.length === 0) {
      toast.error("C\u1ea7n \u00edt nh\u1ea5t m\u1ed9t b\u00e0i h\u1ecdc");
      return;
    }
    setPublishing(true);
    try {
      const contentForDb =
        [draft.summary.trim(), draft.description.trim()].filter(Boolean).join("\n\n") ||
        draft.content.trim() ||
        null;

      const res = await fetch("/api/teacher/courses/from-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseData: {
            title: draft.title.trim(),
            description: draft.description.trim() || null,
            content: contentForDb,
            course_type: draft.course_type,
            category: normalizeCourseCategory(draft.category.trim()),
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

      const text = await res.text();
      let parsed: { error?: string; course_id?: string } = {};
      if (text.trim()) {
        try {
          parsed = JSON.parse(text) as { error?: string; course_id?: string };
        } catch {
          toast.error(
            "Ph\u1ea3n h\u1ed3i m\u00e1y ch\u1ee7 kh\u00f4ng h\u1ee3p l\u1ec7 khi l\u01b0u."
          );
          return;
        }
      }

      if (!res.ok) {
        toast.error(parsed.error ?? "Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c");
        return;
      }
      toast.success("\u0110\u00e3 xu\u1ea5t b\u1ea3n kh\u00f3a h\u1ecdc");
      handleClose(false);
      onSaved?.();
      router.refresh();
      if (parsed.course_id) {
        router.push(`/teacher/courses/${parsed.course_id}/curriculum`);
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
                {"Quay l\u1ea1i"}
              </Button>
            ) : null}
            <Sparkles className="text-primary h-5 w-5 shrink-0" />
            {"T\u1ea1o kh\u00f3a h\u1ecdc b\u1eb1ng AI"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="flex max-h-[inherit] flex-1 flex-col overflow-hidden"
          >
            <div className="max-h-[min(70vh,720px)] flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6">
              <p className="text-muted-foreground text-xs leading-relaxed">
                {"Ch\u1ecdn m\u1ed9t ngu\u1ed3n: "}
                <strong>{"v\u0103n b\u1ea3n"}</strong>
                {" ho\u1eb7c "}
                <strong>PDF</strong>
                {". \u0110i\u1ec1n ch\u1ee7 \u0111\u1ec1 ho\u1eb7c g\u1ee3i \u00fd ti\u00eau \u0111\u1ec1. Sau \u0111\u00f3 xem tr\u01b0\u1edbc, ch\u1ec9nh s\u1eeda v\u00e0 xu\u1ea5t b\u1ea3n."}
              </p>
              {formError ? (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {"Ngu\u1ed3n n\u1ed9i dung"}
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="contentSource"
                      checked={source === "text"}
                      onChange={() => {
                        setSource("text");
                        setPdfFile(null);
                      }}
                      className="border-input h-4 w-4"
                    />
                    {"Nh\u1eadp v\u0103n b\u1ea3n"}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="contentSource"
                      checked={source === "pdf"}
                      onChange={() => {
                        setSource("pdf");
                        setTextContent("");
                      }}
                      className="border-input h-4 w-4"
                    />
                    {"T\u1ea3i file PDF"}
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-topic">{"Ch\u1ee7 \u0111\u1ec1"}</Label>
                <Input
                  id="ai-gen-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={"V\u00ed d\u1ee5: Python cho ng\u01b0\u1eddi m\u1edbi b\u1eaft \u0111\u1ea7u"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-custom-title">
                  {
                    "G\u1ee3i \u00fd ti\u00eau \u0111\u1ec1 (tu\u1ef3 ch\u1ecdn \u2014 \u0111\u1ec3 tr\u1ed1ng \u0111\u1ec3 AI \u0111\u1eb7t)"
                  }
                </Label>
                <Input
                  id="ai-gen-custom-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={
                    "\u0110\u1ec3 tr\u1ed1ng n\u1ebfu mu\u1ed1n AI t\u1ef1 \u0111\u1eb7t ti\u00eau \u0111\u1ec1"
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-gen-additional">
                  {"Ghi ch\u00fa th\u00eam (tu\u1ef3 ch\u1ecdn)"}
                </Label>
                <Textarea
                  id="ai-gen-additional"
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  rows={2}
                  placeholder={
                    "\u0110\u1ed1i t\u01b0\u1ee3ng, tr\u1ecdng t\u00e2m\u2026"
                  }
                />
              </div>

              {source === "text" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="ai-gen-paste">
                    {"N\u1ed9i dung v\u0103n b\u1ea3n *"}
                  </Label>
                  <Textarea
                    id="ai-gen-paste"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={8}
                    placeholder={
                      "D\u00e1n \u0111\u1ec1 c\u01b0\u01a1ng, t\u00e0i li\u1ec7u ho\u1eb7c m\u00f4 t\u1ea3 chi ti\u1ebft\u2026"
                    }
                    className={cn("min-h-[140px]")}
                  />
                </div>
              ) : source === "pdf" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="ai-gen-pdf">File PDF *</Label>
                  <Input
                    id="ai-gen-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    {
                      "PDF c\u1ea7n c\u00f3 l\u1edbp ch\u1eef (kh\u00f4ng ph\u1ea3i \u1ea3nh scan), t\u1ed1i \u0111a 12MB."
                    }
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {"Ch\u1ecdn \u201cNh\u1eadp v\u0103n b\u1ea3n\u201d ho\u1eb7c \u201cT\u1ea3i file PDF\u201d \u0111\u1ec3 ti\u1ebfp t\u1ee5c."}
                </p>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/25 p-3">
                <input
                  type="checkbox"
                  id="ai-gen-enrich"
                  checked={enrichContext}
                  onChange={(e) => setEnrichContext(e.target.checked)}
                  className="border-input mt-0.5 h-4 w-4 shrink-0 rounded"
                />
                <Label
                  htmlFor="ai-gen-enrich"
                  className="cursor-pointer text-xs font-normal leading-snug"
                >
                  {
                    "B\u1ed5 sung ng\u1eef c\u1ea3nh ch\u01b0\u01a1ng tr\u00ecnh (ki\u1ebfn th\u1ee9c chung; kh\u00f4ng thay n\u1ed9i dung b\u1ea1n nh\u1eadp)."
                  }
                </Label>
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                {"Hu\u1ef7"}
              </Button>
              <Button type="submit" disabled={loading} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                {loading
                  ? "\u0110ang g\u1ecdi AI\u2026"
                  : "T\u1ea1o kh\u00f3a h\u1ecdc"}
              </Button>
            </DialogFooter>
          </form>
        ) : draft ? (
          <div className="flex max-h-[inherit] min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-3 sm:px-6">
              <CoursePreviewEditor
                value={draft}
                onChange={setDraft}
                disabled={publishing}
              />
            </div>
            <DialogFooter className="border-t border-border/60 px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={publishing}
              >
                {"\u0110\u00f3ng"}
              </Button>
              <Button
                type="button"
                className="gap-1.5"
                disabled={publishing}
                onClick={() => void handlePublish()}
              >
                {publishing
                  ? "\u0110ang l\u01b0u\u2026"
                  : "Xu\u1ea5t b\u1ea3n kh\u00f3a h\u1ecdc"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
