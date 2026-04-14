const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export const ROADMAP_EMBEDDING_MODEL = "text-embedding-3-small";
export const ROADMAP_EMBEDDING_DIM = 1536;

export async function createEmbedding(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const res = await fetch(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ROADMAP_EMBEDDING_MODEL,
      input: text.replace(/\s+/g, " ").trim().slice(0, 8000),
      dimensions: ROADMAP_EMBEDDING_DIM,
    }),
  });

  const j = (await res.json()) as {
    data?: { embedding: number[] }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(j.error?.message ?? `OpenAI embeddings HTTP ${res.status}`);
  }

  const emb = j.data?.[0]?.embedding;
  if (!emb?.length) {
    throw new Error("Empty embedding from OpenAI");
  }
  return emb;
}

export async function createEmbeddingsBatch(
  inputs: string[]
): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const res = await fetch(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ROADMAP_EMBEDDING_MODEL,
      input: inputs.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000)),
      dimensions: ROADMAP_EMBEDDING_DIM,
    }),
  });

  const j = (await res.json()) as {
    data?: { embedding: number[]; index: number }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(j.error?.message ?? `OpenAI embeddings HTTP ${res.status}`);
  }

  const rows = j.data ?? [];
  rows.sort((a, b) => a.index - b.index);
  return rows.map((r) => r.embedding);
}
