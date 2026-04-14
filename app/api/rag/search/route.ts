import { createEmbedding } from "@/lib/rag/openai-embeddings";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  query: z.string().min(1).max(4000),
  topK: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await createEmbedding(parsed.query);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Embedding failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("match_roadmap_embeddings", {
    query_embedding: queryEmbedding,
    match_count: parsed.topK ?? 5,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as {
    id: string;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  }[];

  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata ?? {},
      similarity: r.similarity,
    })),
  });
}
