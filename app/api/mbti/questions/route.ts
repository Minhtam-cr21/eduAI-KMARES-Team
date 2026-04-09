import { MBTI_QUESTIONS } from "@/lib/mbti/questions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(MBTI_QUESTIONS);
}
