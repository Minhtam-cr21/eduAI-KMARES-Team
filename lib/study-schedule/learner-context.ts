import type { SupabaseClient } from "@supabase/supabase-js";

import {
  learnerAnalysisSchema,
  learnerProfileSchema,
  type LearnerAnalysis,
  type LearnerProfile,
} from "@/lib/assessment/contracts";

export type ScheduleLearnerContext = {
  learner_profile: LearnerProfile | null;
  ai_analysis: LearnerAnalysis | null;
};

export async function loadScheduleLearnerContext(
  supabase: SupabaseClient,
  studentId: string
): Promise<ScheduleLearnerContext> {
  const { data, error } = await supabase
    .from("career_orientations")
    .select("learner_profile, ai_analysis, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      learner_profile: null,
      ai_analysis: null,
    };
  }

  const learnerProfile = learnerProfileSchema.safeParse(data.learner_profile);
  const aiAnalysis = learnerAnalysisSchema.safeParse(data.ai_analysis);

  return {
    learner_profile: learnerProfile.success ? learnerProfile.data : null,
    ai_analysis: aiAnalysis.success ? aiAnalysis.data : null,
  };
}
