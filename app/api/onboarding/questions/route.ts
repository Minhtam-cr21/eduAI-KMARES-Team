import { onboardingQuestions } from "@/lib/onboarding/questions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(onboardingQuestions);
}
