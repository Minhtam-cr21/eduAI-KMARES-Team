import { isRuntimeEnvError } from "@/lib/runtime/env";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Route handlers `/api/teacher/*`: session + role teacher hoặc admin.
 */
export async function getTeacherOrAdminSupabase(): Promise<
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; response: NextResponse }
> {
  let supabase: SupabaseClient;
  try {
    supabase = createClient();
  } catch (error) {
    if (isRuntimeEnvError(error)) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: error.message,
            code: error.code,
            missingEnv: error.missingEnv,
          },
          { status: 503 }
        ),
      };
    }
    throw error;
  }
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!profile || !["teacher", "admin"].includes(profile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Chỉ giáo viên hoặc admin." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, supabase, userId: user.id };
}
