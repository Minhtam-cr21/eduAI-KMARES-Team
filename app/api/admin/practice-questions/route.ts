import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  language: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  initial_code: z.string().default(""),
  sample_input: z.string().default(""),
  sample_output: z.string().default(""),
  hint: z.string().default(""),
  is_published: z.boolean().default(true),
});

export async function GET() {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { data, error } = await admin.supabase
    .from("practice_questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await admin.supabase
    .from("practice_questions")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
