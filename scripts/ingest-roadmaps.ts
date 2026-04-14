/**
 * Đọc mọi file .pdf và .txt trong roadmaps/, trích text, chunk, embedding, lưu roadmap_embeddings.
 *
 * Cần: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (hoặc SUPABASE_SERVICE_ROLE_JWT_KEY), OPENAI_API_KEY
 *
 * Chạy: npm run ingest:roadmaps
 */

import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { getOpenAI } from "../lib/ai/openai-client";
import { PDFParse } from "pdf-parse";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_JWT_KEY?.trim();
const apiKey = process.env.OPENAI_API_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}
if (!apiKey) {
  console.error("Thiếu OPENAI_API_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const openai = getOpenAI();

const EMBEDDING_MODEL = "text-embedding-3-small" as const;
const EMBEDDING_DIM = 1536;

function chunkText(text: string, maxLength = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  for (const sentence of sentences) {
    if (
      (currentChunk + sentence).length > maxLength &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter((c) => c.length > 0);
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function processFile(filePath: string, source: string) {
  console.log(`Processing ${source}...`);
  let text = "";
  if (filePath.toLowerCase().endsWith(".pdf")) {
    text = await extractTextFromPDF(filePath);
  } else {
    text = fs.readFileSync(filePath, "utf-8");
  }
  if (!text.trim()) {
    console.log(`  ⚠️ No text extracted from ${source}`);
    return;
  }
  const chunks = chunkText(text, 1000);
  console.log(`  → ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].slice(0, 8000);
    try {
      const embeddingRes = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk,
        dimensions: EMBEDDING_DIM,
      });
      const embedding = embeddingRes.data[0]?.embedding;
      if (!embedding?.length) {
        console.error(`  ❌ Empty embedding for chunk ${i}`);
        continue;
      }

      const { error } = await supabase.from("roadmap_embeddings").insert({
        content: chunk,
        embedding,
        metadata: {
          source,
          chunk_index: i,
          total_chunks: chunks.length,
        },
      });
      if (error) {
        console.error(`  ❌ Error inserting chunk ${i}:`, error.message);
      } else {
        console.log(`  ✅ Chunk ${i + 1}/${chunks.length} inserted`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ Chunk ${i + 1} failed:`, msg);
    }
  }
}

async function main() {
  const dir = path.join(process.cwd(), "roadmaps");
  if (!fs.existsSync(dir)) {
    console.error(
      "Thư mục roadmaps/ không tồn tại. Hãy tạo và bỏ file PDF vào."
    );
    process.exit(1);
  }
  const files = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        !f.startsWith(".") &&
        (f.toLowerCase().endsWith(".pdf") ||
          f.toLowerCase().endsWith(".txt"))
    )
    .sort();

  if (files.length === 0) {
    console.error("Không có file .pdf hoặc .txt trong roadmaps/.");
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    const source = file.replace(/\.(pdf|txt)$/i, "");
    try {
      await processFile(filePath, source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Failed ${file}:`, msg);
    }
  }
  console.log("🎉 Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
