import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sanitizeIlike(q: string): string {
  return q.replace(/[%_\\]/g, "").slice(0, 120);
}

/** GET — danh sách người dùng (phân trang, lọc role, tìm theo tên). */
export async function GET(request: NextRequest) {
  const admin = await getAdminSupabase();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSizeRaw = parseInt(searchParams.get("page_size") || "20", 10);
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw || 20));
  const roleParam = searchParams.get("role");
  const q = (searchParams.get("q") || "").trim();

  let query = admin.supabase
    .from("profiles")
    .select(
      "id, full_name, role, created_at, mbti_type, mbti_last_test, avatar_url, goal, assessment_completed",
      { count: "exact" }
    );

  if (
    roleParam &&
    ["student", "teacher", "admin"].includes(roleParam)
  ) {
    query = query.eq("role", roleParam);
  }

  const safeQ = sanitizeIlike(q);
  if (safeQ.length > 0) {
    query = query.ilike("full_name", `%${safeQ}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const emailMap = new Map<string, string | null>();

  try {
    const service = createServiceRoleClient();
    await Promise.all(
      rows.map(async (row) => {
        const id = row.id as string;
        const { data: u, error: e } = await service.auth.admin.getUserById(id);
        if (!e && u?.user) {
          emailMap.set(id, u.user.email ?? null);
        } else {
          emailMap.set(id, null);
        }
      })
    );
  } catch {
    for (const row of rows) {
      emailMap.set(row.id as string, null);
    }
  }

  const users = rows.map((row) => ({
    ...row,
    email: emailMap.get(row.id as string) ?? null,
  }));

  return NextResponse.json({
    users,
    total: count ?? 0,
    page,
    page_size: pageSize,
  });
}
