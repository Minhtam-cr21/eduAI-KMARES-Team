import { studentPostAuthPath } from "@/lib/auth/student-post-auth";
import { RuntimeEnvError, getSupabasePublicEnv } from "@/lib/runtime/env";
import { getRequestOrigin } from "@/lib/site-origin";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * PKCE + session cookies phải gắn trực tiếp lên NextResponse.redirect.
 * Dùng `cookies()` từ next/headers trong Route Handler có thể không đồng bộ
 * với response redirect → lỗi "PKCE code verifier not found in storage".
 */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, c);
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const origin = getRequestOrigin(request);

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_code", origin)
    );
  }

  const errorRedirect = (msg: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );

  let urlEnv: string;
  let anonKey: string;
  try {
    const env = getSupabasePublicEnv();
    urlEnv = env.url;
    anonKey = env.anonKey;
  } catch (error) {
    if (error instanceof RuntimeEnvError) {
      return errorRedirect(error.code);
    }
    throw error;
  }

  let redirectTarget = new URL(next?.startsWith("/") ? next : "/student", origin);

  let response = NextResponse.redirect(redirectTarget);

  const supabase = createServerClient(
    urlEnv,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return errorRedirect(error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, assessment_completed, onboarding_completed")
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

      redirectTarget = new URL("/student", origin);
    } else if (next?.startsWith("/")) {
      redirectTarget = new URL(next, origin);
    } else if (profile.role === "admin") {
      redirectTarget = new URL("/admin", origin);
    } else if (profile.role === "teacher") {
      redirectTarget = new URL("/teacher", origin);
    } else {
      redirectTarget = new URL(
        studentPostAuthPath({
          assessment_completed: profile.assessment_completed as boolean | null,
          onboarding_completed: profile.onboarding_completed as boolean | null,
        }),
        origin
      );
    }

    const finalResponse = NextResponse.redirect(redirectTarget);
    copyCookies(response, finalResponse);
    return finalResponse;
  }

  const fallback = NextResponse.redirect(
    new URL(next?.startsWith("/") ? next : "/student", origin)
  );
  copyCookies(response, fallback);
  return fallback;
}
