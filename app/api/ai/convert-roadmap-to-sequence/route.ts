import { buildCourseSequenceFromRoadmap } from "@/lib/ai/convert-roadmap-to-sequence";
import { getTeacherOrAdminSupabase } from "@/lib/auth/assert-teacher-api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  roadmapId: z.string().uuid(),
});

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

  const { data: roadmap, error } = await gate.supabase
    .from("custom_roadmaps")
    .select("id, title, modules, total_duration_days, reasoning, status")
    .eq("id", parsed.data.roadmapId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!roadmap) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const courseSequence = await buildCourseSequenceFromRoadmap({
      title: roadmap.title as string | null,
      modules: roadmap.modules,
      reasoning: roadmap.reasoning as string | null,
      total_duration_days: roadmap.total_duration_days as number | null,
    });
    return NextResponse.json({ courseSequence });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Convert failed";
    console.error("[convert-roadmap-to-sequence]", msg);
    return NextResponse.json({ error: msg, courseSequence: [] }, { status: 502 });
  }
}
