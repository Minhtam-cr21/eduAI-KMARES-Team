import { ASSESSMENT_QUESTIONS } from "@/lib/assessment/questions";
import { NextResponse } from "next/server";
import { cache } from "react";

const getCachedQuestions = cache(() => ASSESSMENT_QUESTIONS);

/** GET — danh sách 50 câu (public). */
export async function GET() {
  return NextResponse.json(getCachedQuestions());
}
