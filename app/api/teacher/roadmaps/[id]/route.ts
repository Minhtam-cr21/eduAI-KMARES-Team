import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(8000).nullable().optional(),
  content: z.string().max(200_000).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string().max(80)).max(50).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data: row, error: fErr } = await gate.supabase
    .from("roadmaps")
    .select("teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fErr) {
    return NextResponse.json({ error: fErr.message }, { status: 500 });
  }
  if (!row || row.teacher_id !== gate.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from("roadmaps")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const { data: row, error: fErr } = await gate.supabase
    .from("roadmaps")
    .select("teacher_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fErr) {
    return NextResponse.json({ error: fErr.message }, { status: 500 });
  }
  if (!row || row.teacher_id !== gate.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await gate.supabase.from("roadmaps").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
