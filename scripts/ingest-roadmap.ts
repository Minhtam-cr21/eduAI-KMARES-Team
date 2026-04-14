/**
 * Ingest roadmap text → chunk → OpenAI text-embedding-3-small → roadmap_embeddings (service role).
 *
 * Chạy: npx tsx scripts/ingest-roadmap.ts
 * Hoặc: npm run ingest:roadmap
 *
 * Biến môi trường: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { chunkText } from "../lib/rag/chunk-text";
import {
  createEmbeddingsBatch,
  ROADMAP_EMBEDDING_DIM,
} from "../lib/rag/openai-embeddings";

function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const SOURCE = "python";
const BATCH = 16;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_JWT_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), "roadmaps/python.txt");
  const raw = readFileSync(filePath, "utf-8");
  const chunks = chunkText(raw, 2000, 200);
  if (chunks.length === 0) {
    console.error("File rỗng hoặc không có chunk.");
    process.exit(1);
  }

  console.log(`Chunks: ${chunks.length} (source=${SOURCE})`);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const embeddings = await createEmbeddingsBatch(slice);
    if (embeddings.some((e) => e.length !== ROADMAP_EMBEDDING_DIM)) {
      console.error("Embedding dimension không khớp 1536.");
      process.exit(1);
    }

    const rows = slice.map((content, j) => ({
      content,
      embedding: embeddings[j],
      metadata: {
        source: SOURCE,
        order_index: i + j,
      },
    }));

    const { error } = await supabase.from("roadmap_embeddings").insert(rows);
    if (error) {
      console.error("Insert lỗi:", error.message);
      process.exit(1);
    }
    console.log(`Đã insert ${i + slice.length}/${chunks.length}`);
  }

  console.log("Xong ingest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
