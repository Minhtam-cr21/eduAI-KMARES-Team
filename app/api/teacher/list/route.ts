import { createClient } from "@/lib/supabase/server";
import type { TeacherDiscoveryPayload } from "@/lib/types/teacher-discovery";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET — danh sách giáo viên (học sinh / user đã đăng nhập). Query: page, limit, search, category */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "12") || 12));
  const search = url.searchParams.get("search")?.trim() || null;
  const category = url.searchParams.get("category")?.trim() || null;
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.rpc("list_teachers_discovery", {
    p_offset: offset,
    p_limit: limit,
    p_search: search,
    p_category: category,
  });

  if (error) {
    console.error("[api/teacher/list]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const raw = data as unknown;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { total: 0, teachers: [], categories: [] } satisfies TeacherDiscoveryPayload
    );
  }

  const obj = raw as Record<string, unknown>;
  const teachers = Array.isArray(obj.teachers) ? obj.teachers : [];
  const categories = Array.isArray(obj.categories)
    ? (obj.categories as unknown[]).map((c) => String(c))
    : [];
  const total = typeof obj.total === "number" ? obj.total : Number(obj.total) || 0;

  const normalized: TeacherDiscoveryPayload = {
    total,
    teachers: teachers.map((t) => {
      const row = t as Record<string, unknown>;
      const skills = Array.isArray(row.skills)
        ? (row.skills as unknown[]).map((s) => String(s))
        : [];
      const fc = Array.isArray(row.featured_courses) ? row.featured_courses : [];
      return {
        id: String(row.id ?? ""),
        full_name: (row.full_name as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
        email_masked: (row.email_masked as string | null) ?? null,
        skills,
        featured_courses: fc.map((x) => {
          const c = x as Record<string, unknown>;
          return {
            id: String(c.id ?? ""),
            title: String(c.title ?? ""),
            thumbnail_url: (c.thumbnail_url as string | null) ?? null,
          };
        }),
        total_students: Number(row.total_students ?? 0),
      };
    }),
    categories,
  };

  return NextResponse.json(normalized);
}
