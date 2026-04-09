import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Chỉ dùng trong Server Component / server actions.
 * Không phải admin → redirect `/dashboard`; chưa đăng nhập → `/login?next=...`.
 * @param loginNextPath — đường dẫn sau khi đăng nhập lại (mặc định `/admin/topics`).
 */
export async function requireAdmin(loginNextPath = "/admin/topics") {
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

  if (error || profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { user, supabase };
}
