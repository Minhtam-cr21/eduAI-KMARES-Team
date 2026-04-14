import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(8000).nullable().optional(),
  content: z.string().max(200_000).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string().max(80)).max(50).optional(),
});

export async function GET() {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("roadmaps")
    .select("*")
    .eq("teacher_id", gate.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, content, image_url, is_public, tags } = parsed.data;

  const { data, error } = await gate.supabase
    .from("roadmaps")
    .insert({
      title,
      description: description ?? null,
      content: content ?? null,
      image_url: image_url ?? null,
      is_public: is_public ?? true,
      tags: tags ?? null,
      teacher_id: gate.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
