import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  type: z.enum(["bug", "content", "other"]),
  description: z.string().min(1),
});

/** POST — người dùng gửi báo cáo. */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid fields", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, description } = parsed.data;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      type,
      description,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
