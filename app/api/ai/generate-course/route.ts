import { enrichCourseContextFromTopic } from "@/lib/ai/enrich-course-context";
import { generateCourseDraftWithOpenAI } from "@/lib/ai/openai-course-generator";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MIN_PDF_TEXT_CHARS = 80;
const MIN_TOPIC_OR_TEXT = 2;
const MAX_PDF_BYTES = 12 * 1024 * 1024;

const ERR_NEED_TOPIC =
  "Nh\u1eadp ch\u1ee7 \u0111\u1ec1 ho\u1eb7c g\u1ee3i \u00fd ti\u00eau \u0111\u1ec1 \u0111\u1ec3 AI \u0111\u1ecbnh h\u01b0\u1edbng kh\u00f3a h\u1ecdc.";
const ERR_PDF_READ = "Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file PDF";
const ERR_PDF_EMPTY =
  "Kh\u00f4ng tr\u00edch \u0111\u01b0\u1ee3c v\u0103n b\u1ea3n t\u1eeb PDF (c\u00f3 th\u1ec3 l\u00e0 file scan). D\u00f9ng PDF c\u00f3 th\u1ec3 copy text ho\u1eb7c ch\u1ebf \u0111\u1ed9 nh\u1eadp v\u0103n b\u1ea3n.";
const ERR_NEED_CONTENT =
  "Vui l\u00f2ng cung c\u1ea5p n\u1ed9i dung v\u0103n b\u1ea3n ho\u1eb7c file PDF.";
const ERR_SERVER =
  "\u0110\u00e3 x\u1ea3y ra l\u1ed7i khi t\u1ea1o kh\u00f3a h\u1ecdc. Vui l\u00f2ng th\u1eed l\u1ea1i sau.";

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const pdfData = await parser.getText();
    const t = (pdfData.text ?? "").trim();
    return t.length > 0 ? t : null;
  } catch (e) {
    console.error("[generate-course] pdf extract", e);
    return null;
  }
}

/** POST multipart/form-data or application/json — teacher: AI draft only (no DB). */
export async function POST(request: Request) {
  try {
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

    let topic = "";
    let teacherTitle = "";
    let teacherDescription = "";
    let textContent = "";
    let enrichContext = false;
    let pdfFile: File | null = null;
    let sourceFileName: string | null = null;

    const ct = request.headers.get("content-type") ?? "";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      topic = String(form.get("topic") ?? "").trim();
      teacherTitle = String(
        form.get("customTitle") ?? form.get("titleHint") ?? ""
      ).trim();
      teacherDescription = String(
        form.get("additionalNote") ?? form.get("descriptionHint") ?? ""
      ).trim();
      textContent = String(form.get("textContent") ?? "").trim();
      enrichContext =
        form.get("enrichContext") === "true" || form.get("enrichContext") === "on";

      const f = form.get("pdfFile");
      if (f instanceof File && f.size > 0) {
        pdfFile = f;
        sourceFileName = f.name || null;
        textContent = "";
      }
    } else {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: "Expected multipart/form-data or JSON body" },
          { status: 400 }
        );
      }
      topic = String(body.topic ?? "").trim();
      teacherTitle = String(
        body.customTitle ?? body.titleHint ?? body.title ?? ""
      ).trim();
      teacherDescription = String(
        body.additionalNote ?? body.descriptionHint ?? body.description ?? ""
      ).trim();
      textContent = String(body.textContent ?? "").trim();
      enrichContext = Boolean(body.enrichContext ?? body.enable_context_enrichment);
      const b64 = typeof body.file_base64 === "string" ? body.file_base64.trim() : "";
      const fn = String(body.file_name ?? "");
      if (b64 && fn.toLowerCase().endsWith(".pdf")) {
        const buf = Buffer.from(b64, "base64");
        if (buf.length > MAX_PDF_BYTES) {
          return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
        }
        pdfFile = new File([new Uint8Array(buf)], fn || "upload.pdf", {
          type: "application/pdf",
        });
        sourceFileName = fn || null;
        textContent = "";
      }
    }

    const hasPdf = Boolean(pdfFile && pdfFile.size > 0);
    let sourceText = "";
    let hadPdf = false;

    if (hasPdf && pdfFile) {
      if (pdfFile.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
      }
      const buf = Buffer.from(await pdfFile.arrayBuffer());
      const extracted = await extractPdfText(buf);
      if (!extracted) {
        return NextResponse.json({ error: ERR_PDF_READ }, { status: 400 });
      }
      if (extracted.length < MIN_PDF_TEXT_CHARS) {
        return NextResponse.json({ error: ERR_PDF_EMPTY }, { status: 400 });
      }
      sourceText = extracted;
      hadPdf = true;
    } else {
      if (!textContent.trim() && !topic.trim()) {
        return NextResponse.json({ error: ERR_NEED_CONTENT }, { status: 400 });
      }
      if (
        topic.length < MIN_TOPIC_OR_TEXT &&
        teacherTitle.length < MIN_TOPIC_OR_TEXT &&
        textContent.trim().length < MIN_TOPIC_OR_TEXT
      ) {
        return NextResponse.json({ error: ERR_NEED_TOPIC }, { status: 400 });
      }
      sourceText = textContent;
    }

    const topicForAi =
      topic ||
      teacherTitle ||
      (hadPdf
        ? "Kh\u00f3a h\u1ecdc theo t\u00e0i li\u1ec7u PDF \u0111\u00ednh k\u00e8m"
        : "Kh\u00f3a h\u1ecdc theo n\u1ed9i dung nh\u1eadp");

    let enrichmentBrief: string | undefined;
    if (enrichContext) {
      try {
        enrichmentBrief = await enrichCourseContextFromTopic({
          topic: topicForAi,
          title: teacherTitle || undefined,
          sourceHint: hadPdf
            ? `PDF ~${sourceText.length} chars`
            : `text ~${sourceText.length} chars`,
        });
      } catch (e) {
        console.warn("[generate-course] enrichment skipped:", e);
      }
    }

    const { draft, usedFallback } = await generateCourseDraftWithOpenAI({
      topic: topicForAi,
      teacherTitle: teacherTitle || undefined,
      teacherDescription: teacherDescription || undefined,
      sourceText,
      enrichmentBrief,
    });

    return NextResponse.json({
      draft,
      source_file: sourceFileName,
      meta: {
        source: hadPdf ? "pdf" : "text",
        pdf_chars: hadPdf ? sourceText.length : null,
        context_enriched: Boolean(enrichmentBrief),
        used_fallback: usedFallback,
      },
    });
  } catch (e) {
    console.error("[generate-course]", e);
    return NextResponse.json(
      {
        error: ERR_SERVER,
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
