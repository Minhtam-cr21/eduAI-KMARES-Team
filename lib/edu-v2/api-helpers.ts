import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type ProfileRow = { role: string | null };

export async function getUserAndProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, profile: null as ProfileRow | null };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    user,
    profile: profile as ProfileRow | null,
  };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function isAdmin(p: ProfileRow | null) {
  return p?.role === "admin";
}

export function isTeacherOrAdmin(p: ProfileRow | null) {
  return p?.role === "teacher" || p?.role === "admin";
}

export function isStudent(p: ProfileRow | null) {
  return p?.role === "student";
}

/** Resolve edu_courses.id for a lesson (via module). */
export async function getEduCourseIdForLesson(
  supabase: ReturnType<typeof createClient>,
  lessonId: string
): Promise<{ courseId: string | null; error?: string }> {
  const { data: les, error: lErr } = await supabase
    .from("edu_lessons")
    .select("module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lErr) return { courseId: null, error: lErr.message };
  if (!les?.module_id) return { courseId: null };
  const { data: mod, error: mErr } = await supabase
    .from("edu_modules")
    .select("course_id")
    .eq("id", les.module_id as string)
    .maybeSingle();
  if (mErr) return { courseId: null, error: mErr.message };
  return { courseId: (mod?.course_id as string) ?? null };
}

export async function assertInstructorOwnsModule(
  supabase: ReturnType<typeof createClient>,
  moduleId: string,
  userId: string,
  profile: ProfileRow | null
) {
  const { data: mod, error } = await supabase
    .from("edu_modules")
    .select("id, course_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (error) return { ok: false as const, response: jsonError(error.message, 500) };
  if (!mod) return { ok: false as const, response: jsonError("Not found", 404) };
  return assertOwnsEduCourse(supabase, mod.course_id as string, userId, profile);
}

export async function assertInstructorOwnsLesson(
  supabase: ReturnType<typeof createClient>,
  lessonId: string,
  userId: string,
  profile: ProfileRow | null
) {
  const { data: les, error } = await supabase
    .from("edu_lessons")
    .select("id, module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) return { ok: false as const, response: jsonError(error.message, 500) };
  if (!les) return { ok: false as const, response: jsonError("Not found", 404) };
  return assertInstructorOwnsModule(
    supabase,
    les.module_id as string,
    userId,
    profile
  );
}

/** Student enrolled in edu course (for app-layer checks beyond public RLS). */
export async function assertStudentEnrolledEduCourse(
  supabase: ReturnType<typeof createClient>,
  courseId: string,
  studentId: string,
  profile?: ProfileRow | null
) {
  if (isAdmin(profile ?? null)) return { ok: true as const };
  const { data: row, error } = await supabase
    .from("edu_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) return { ok: false as const, response: jsonError(error.message, 500) };
  if (!row) return { ok: false as const, response: jsonError("Enrollment required", 403) };
  return { ok: true as const };
}

export async function fetchEduCourse(
  supabase: ReturnType<typeof createClient>,
  courseId: string
) {
  return supabase.from("edu_courses").select("*").eq("id", courseId).maybeSingle();
}

export async function assertOwnsEduCourse(
  supabase: ReturnType<typeof createClient>,
  courseId: string,
  userId: string,
  profile: ProfileRow | null
) {
  if (isAdmin(profile)) return { ok: true as const };
  const { data: row, error } = await supabase
    .from("edu_courses")
    .select("id, instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  if (error) return { ok: false as const, response: jsonError(error.message, 500) };
  if (!row) return { ok: false as const, response: jsonError("Not found", 404) };
  if ((row as { instructor_id: string }).instructor_id !== userId) {
    return { ok: false as const, response: jsonError("Forbidden", 403) };
  }
  return { ok: true as const };
}
