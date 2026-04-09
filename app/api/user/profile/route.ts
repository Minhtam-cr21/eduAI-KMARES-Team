import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

function zodMessage(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`)
    .join(" • ");
}

const profilePutSchema = z.object({
  goal: z.string().optional(),
  hours_per_day: z.coerce.number().int().min(1).max(8).optional(),
  preferred_learning: z.string().optional(),
});

/**
 * GET /api/user/profile — profile của user đăng nhập.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, goal, hours_per_day, preferred_learning, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Không tìm thấy profile." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

/**
 * PUT /api/user/profile — chỉ goal, hours_per_day, preferred_learning.
 */
export async function PUT(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không phải JSON." }, { status: 400 });
  }

  const parsed = profilePutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;
  const patch: Record<string, unknown> = {};
  if (body.goal !== undefined) patch.goal = body.goal.trim() || null;
  if (body.hours_per_day !== undefined) patch.hours_per_day = body.hours_per_day;
  if (body.preferred_learning !== undefined) {
    patch.preferred_learning = body.preferred_learning.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Không có trường cập nhật." }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("id, goal, hours_per_day, preferred_learning, full_name, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
