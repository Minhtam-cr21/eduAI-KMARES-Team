import { loadAssessmentResult } from "@/lib/assessment/load-result";
import { isRuntimeEnvError } from "@/lib/runtime/env";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET — kết quả trắc nghiệm (profile + career_orientations + traits + khóa gợi ý). */
export async function GET() {
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient();
  } catch (error) {
    if (isRuntimeEnvError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          missingEnv: error.missingEnv,
        },
        { status: 503 }
      );
    }
    throw error;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loaded = await loadAssessmentResult(supabase, user.id);
  if (!loaded.ok) {
    if (loaded.reason === "schema_not_synced") {
      return NextResponse.json(
        {
          error: loaded.message,
          code: "schema_not_synced",
        },
        { status: 503 }
      );
    }
    if (loaded.reason === "not_completed") {
      return NextResponse.json(
        { error: "Chưa hoàn thành bài test", code: "not_completed" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Chưa có bản ghi định hướng nghề nghiệp", code: "no_career_row" },
      { status: 404 }
    );
  }

  return NextResponse.json(loaded.data);
}
