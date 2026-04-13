import { generatePathFromAssessment } from "@/lib/assessment/path-generator";
import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  studentId: z.string().uuid(),
});

async function suggestForStudent(studentId: string, supabase: SupabaseClient) {
  return generatePathFromAssessment(studentId, supabase);
}

/** GET ?studentId=uuid — cùng payload với POST (courseSequence + reasoning). */
export async function GET(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  const studentId = new URL(request.url).searchParams.get("studentId");
  const parsed = z.string().uuid().safeParse(studentId);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query studentId (UUID) là bắt buộc." },
      { status: 400 }
    );
  }

  try {
    const { courseSequence, reasoning } = await suggestForStudent(
      parsed.data,
      gate.supabase
    );
    return NextResponse.json({ courseSequence, reasoning });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi gợi ý lộ trình";
    console.error("[personalized-path/suggest GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await getTeacherOrAdminSupabase();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { courseSequence, reasoning } = await suggestForStudent(
      parsed.data.studentId,
      gate.supabase
    );
    return NextResponse.json({ courseSequence, reasoning });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi gợi ý lộ trình";
    console.error("[personalized-path/suggest]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
