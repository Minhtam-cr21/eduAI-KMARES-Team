import { BackButton } from "@/components/ui/back-button";
import { ProfileForm } from "@/components/student/profile-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, created_at, goal, hours_per_day, preferred_learning, birth_year, school, class, mbti_type, learning_style, onboarding_completed, career_orientation, assessment_completed, strengths, weaknesses"
    )
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-6" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thông tin tài khoản EduAI.
        </p>
      </div>

      <ProfileForm
        data={{
          email: user.email ?? "",
          userId: user.id,
          role: profile?.role ?? null,
          fullName: profile?.full_name ?? null,
          createdAt: profile?.created_at ?? null,
          goal: profile?.goal ?? null,
          hoursPerDay: profile?.hours_per_day ?? null,
          preferredLearning: profile?.preferred_learning ?? null,
          birthYear: profile?.birth_year ?? null,
          school: profile?.school ?? null,
          className: profile?.class ?? null,
          mbtiType: profile?.mbti_type ?? null,
          learningStyle: profile?.learning_style ?? null,
          onboardingCompleted: profile?.onboarding_completed ?? false,
          careerOrientation: profile?.career_orientation ?? null,
          assessmentCompleted: profile?.assessment_completed === true,
          strengths: (profile?.strengths as string[] | null) ?? null,
          weaknesses: (profile?.weaknesses as string[] | null) ?? null,
        }}
      />
    </main>
  );
}
