import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { RuntimeEnvError, getSupabasePublicEnv } from "@/lib/runtime/env";
import { NextResponse, type NextRequest } from "next/server";

/** Cần đăng nhập (mọi role): dashboard học sinh, học bài, khu vực student. */
const PROTECTED_PREFIXES = [
  "/admin",
  "/teacher",
  "/dashboard",
  "/learn",
  "/profile",
  "/assessment",
  "/personalized-roadmap",
  "/career",
  "/student",
  "/quizzes",
  "/study-schedule",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Trang và API admin — chỉ `profiles.role = 'admin'`. */
function needsAdminRole(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

/** API khám phá GV: mọi user đăng nhập (học sinh), không ép role teacher. */
function isTeacherDiscoveryStudentApi(pathname: string): boolean {
  return (
    pathname === "/api/teacher/list" ||
    pathname.startsWith("/api/teacher/public/")
  );
}

/** `/teacher/*` và `/api/teacher/*` — `profiles.role` là `teacher` hoặc `admin`. */
function needsTeacherOrAdminRole(pathname: string): boolean {
  if (isTeacherDiscoveryStudentApi(pathname)) {
    return false;
  }
  return (
    pathname === "/teacher" ||
    pathname.startsWith("/teacher/") ||
    pathname === "/api/teacher" ||
    pathname.startsWith("/api/teacher/") ||
    pathname === "/api/notifications" ||
    pathname.startsWith("/api/notifications/")
  );
}

/** Redirect luôn dựa trên request.nextUrl (cùng host với request), không hardcode localhost. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabasePublicEnv());
  } catch (error) {
    if (error instanceof RuntimeEnvError) {
      if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            missingEnv: error.missingEnv,
          },
          { status: 503 }
        );
      }

      return new NextResponse(error.message, {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    throw error;
  }

  const supabase = createServerClient(
    url,
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  if (needsAdminRole(pathname)) {
    if (!session) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dash = request.nextUrl.clone();
      dash.pathname = "/dashboard";
      dash.search = "";
      return NextResponse.redirect(dash);
    }
  }

  if (needsTeacherOrAdminRole(pathname)) {
    if (!session) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile || !["teacher", "admin"].includes(profile.role)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dash = request.nextUrl.clone();
      dash.pathname = "/dashboard";
      dash.search = "";
      return NextResponse.redirect(dash);
    }
  }

  if (isProtectedPath(pathname) && !session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
