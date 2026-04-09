import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_code", url.origin)
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        url.origin
      )
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[auth/callback] profiles read:", profileError.message);
    }

    if (!profile) {
      const { error: insErr } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        role: "student",
      });
      if (insErr) {
        console.error("[auth/callback] profiles insert:", insErr.message);
      }

      if (next) {
        return NextResponse.redirect(new URL(next, url.origin));
      }
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }

    if (next) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    if (profile.role === "admin") {
      return NextResponse.redirect(new URL("/admin", url.origin));
    }
    if (profile.role === "teacher") {
      return NextResponse.redirect(new URL("/teacher", url.origin));
    }
    if (profile.onboarding_completed === true) {
      return NextResponse.redirect(new URL("/student", url.origin));
    }
    return NextResponse.redirect(new URL("/onboarding", url.origin));
  }

  return NextResponse.redirect(new URL(next ?? "/student", url.origin));
}
