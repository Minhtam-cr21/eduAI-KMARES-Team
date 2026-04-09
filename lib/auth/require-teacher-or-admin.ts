import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Server Component / server actions: chỉ teacher hoặc admin.
 * Không phải → redirect `/dashboard`; chưa đăng nhập → `/login?next=...`.
 */
export async function requireTeacherOrAdmin(
  loginNextPath = "/teacher/dashboard"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(loginNextPath)}`);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !["teacher", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return { user, supabase, profile };
}
