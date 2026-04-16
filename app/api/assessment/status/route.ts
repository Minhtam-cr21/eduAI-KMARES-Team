import { createClient } from "@/lib/supabase/server";
import {
  createSchemaSyncError,
  schemaSyncErrorResponse,
  type SchemaDependency,
} from "@/lib/supabase/schema-sync";
import { NextResponse } from "next/server";

const PHASE3_STATUS_DEPENDENCY: SchemaDependency = {
  phase: "Phase 3",
  migrationFile: "supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql",
  feature: "assessment status route",
  relation: "career_orientations",
  columns: ["analysis_source", "assessment_version"],
};

/** GET — trạng thái hoàn thành bài trắc nghiệm định hướng. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("assessment_completed, assessment_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: career, error: careerErr } = await supabase
    .from("career_orientations")
    .select("analysis_source, assessment_version")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (careerErr) {
    const schemaError = createSchemaSyncError(careerErr, PHASE3_STATUS_DEPENDENCY);
    if (schemaError) {
      return schemaSyncErrorResponse(schemaError);
    }
    return NextResponse.json({ error: careerErr.message }, { status: 500 });
  }

  return NextResponse.json({
    completed: profile?.assessment_completed === true,
    completedAt: (profile?.assessment_completed_at as string | null) ?? null,
    analysisSource:
      typeof career?.analysis_source === "string" ? career.analysis_source : null,
    assessmentVersion:
      typeof career?.assessment_version === "string"
        ? career.assessment_version
        : null,
  });
}
