import { getOpenAI } from "@/lib/ai/openai-client";

export const ROADMAP_EMBEDDING_MODEL = "text-embedding-3-small";
export const ROADMAP_EMBEDDING_DIM = 1536;

export async function createEmbedding(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: ROADMAP_EMBEDDING_MODEL,
    input: text.replace(/\s+/g, " ").trim().slice(0, 8000),
    dimensions: ROADMAP_EMBEDDING_DIM,
  });

  const emb = res.data[0]?.embedding;
  if (!emb?.length) {
    throw new Error("Empty embedding from OpenAI");
  }
  return emb;
}

export async function createEmbeddingsBatch(
  inputs: string[]
): Promise<number[][]> {
  const res = await getOpenAI().embeddings.create({
    model: ROADMAP_EMBEDDING_MODEL,
    input: inputs.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000)),
    dimensions: ROADMAP_EMBEDDING_DIM,
  });

  const rows = res.data ?? [];
  rows.sort((a, b) => a.index - b.index);
  return rows.map((r) => r.embedding);
}
