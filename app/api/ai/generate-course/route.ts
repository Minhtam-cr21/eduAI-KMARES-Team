import { enrichCourseContextFromTopic } from "@/lib/ai/enrich-course-context";
import { mapOutlineToDraft } from "@/lib/ai/ai-course-draft";
import {
  buildFallbackCourseOutline,
  generateCourseOutlineFromText,
  type GenerateOutlineMeta,
} from "@/lib/ai/generate-course-outline";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SOURCE_CHARS = 200_000;
const MIN_PDF_TEXT_CHARS = 80;

const bodySchema = z.object({
  topic: z.string().min(1).max(8000),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(8000).optional().nullable(),
  /** Nội dung văn bản tham khảo (bổ sung cho hoặc thay PDF). */
  textContent: z.string().max(MAX_SOURCE_CHARS).optional().nullable(),
  file_base64: z.string().optional().nullable(),
  file_name: z.string().max(255).optional().nullable(),
  enable_context_enrichment: z.boolean().optional().default(true),
});

/** POST — teacher: AI sinh bản thảo khóa + bài học (không ghi DB). GV xem trước và lưu qua /api/teacher/courses/from-ai. */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    topic,
    title,
    description,
    textContent,
    file_base64,
    file_name,
    enable_context_enrichment,
  } = parsed.data;

  const lowerName = (file_name ?? "").toLowerCase();
  const isPdf = lowerName.endsWith(".pdf");
  let sourceText = "";
  let hadFile = false;

  if (file_base64?.trim()) {
    hadFile = true;
    let buf: Buffer;
    try {
      buf = Buffer.from(file_base64, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 file" }, { status: 400 });
    }
    if (buf.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
    }
    if (isPdf) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const pdfData = await parser.getText();
      sourceText = (pdfData.text ?? "").trim();
    } else {
      sourceText = buf.toString("utf8").trim().slice(0, MAX_SOURCE_CHARS);
    }
  }

  if (isPdf && hadFile && sourceText.length < MIN_PDF_TEXT_CHARS) {
    return NextResponse.json(
      {
        error:
          "Could not extract text from this PDF (it may be scanned images). Use a text-based PDF, a .txt file, or paste text below.",
      },
      { status: 400 }
    );
  }

  const teacherText = textContent?.trim() ?? "";
  if (teacherText) {
    const block = `\n\n--- Nội dung văn bản tham khảo (giáo viên) ---\n${teacherText.slice(0, MAX_SOURCE_CHARS)}`;
    sourceText = sourceText.trim() ? `${sourceText.slice(0, MAX_SOURCE_CHARS)}${block}` : teacherText;
  }

  if (!sourceText.trim()) {
    sourceText = topic;
  }

  const sourceTruncated = sourceText.length > MAX_SOURCE_CHARS;
  const meta: GenerateOutlineMeta = {
    hadPdfUpload: isPdf && hadFile,
    pdfCharsExtracted: isPdf && hadFile ? sourceText.length : 0,
    pdfTextEmpty: !sourceText.trim(),
    sourceTruncated,
  };

  if (enable_context_enrichment) {
    try {
      const hintParts: string[] = [];
      if (meta.hadPdfUpload) {
        hintParts.push(`PDF extract ~${meta.pdfCharsExtracted} chars`);
      } else if (hadFile) {
        hintParts.push(`text file ~${sourceText.length} chars`);
      } else if (teacherText) {
        hintParts.push(`pasted text ~${teacherText.length} chars`);
      } else {
        hintParts.push("no attachment");
      }
      meta.externalContextBrief = await enrichCourseContextFromTopic({
        topic,
        title: title ?? undefined,
        sourceHint: hintParts.join("; "),
      });
    } catch (e) {
      console.warn("[generate-course] context enrichment skipped:", e);
    }
  }

  let usedFallback = false;
  let outline;
  try {
    outline = await generateCourseOutlineFromText(
      {
        topic,
        title: title ?? undefined,
        description: description ?? undefined,
        sourceText,
      },
      meta
    );
  } catch (e) {
    console.warn("[generate-course] AI failed, using template:", e);
    outline = buildFallbackCourseOutline(topic);
    usedFallback = true;
  }

  if (title?.trim()) {
    outline = { ...outline, course_title: title.trim() };
  }

  const draft = mapOutlineToDraft(outline);
  draft.description = description?.trim() || draft.description;
  draft.content = draft.description;

  return NextResponse.json({
    draft,
    source_file: file_name?.trim() || null,
    meta: {
      pdf_chars: meta.hadPdfUpload ? meta.pdfCharsExtracted : null,
      context_enriched: Boolean(meta.externalContextBrief),
      source_truncated: sourceTruncated,
      used_fallback: usedFallback,
    },
  });
}
