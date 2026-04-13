import { ASSESSMENT_QUESTIONS } from "@/lib/assessment/questions";
import { NextResponse } from "next/server";

/** GET — danh sách 50 câu (public). */
export async function GET() {
  return NextResponse.json(ASSESSMENT_QUESTIONS);
}
