import type { TeacherPublicProfile } from "@/lib/types/teacher-discovery";

export function parseTeacherPublicProfile(
  data: unknown
): TeacherPublicProfile | null {
  if (data == null || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (!row.id) return null;

  const skills = Array.isArray(row.skills)
    ? (row.skills as unknown[]).map((s) => String(s))
    : [];
  const coursesRaw = Array.isArray(row.published_courses)
    ? row.published_courses
    : [];

  return {
    id: String(row.id),
    full_name: (row.full_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    email_masked: (row.email_masked as string | null) ?? null,
    skills,
    published_courses: coursesRaw.map((x) => {
      const c = x as Record<string, unknown>;
      return {
        id: String(c.id ?? ""),
        title: String(c.title ?? ""),
        description: (c.description as string | null) ?? null,
        category: String(c.category ?? ""),
        course_type: String(c.course_type ?? ""),
        thumbnail_url: (c.thumbnail_url as string | null) ?? null,
        created_at: String(c.created_at ?? ""),
      };
    }),
    total_students: Number(row.total_students ?? 0),
  };
}
