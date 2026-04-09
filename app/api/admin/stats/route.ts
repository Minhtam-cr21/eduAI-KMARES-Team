import { getAdminSupabase } from "@/lib/auth/assert-admin-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await getAdminSupabase();
  if (!gate.ok) return gate.response;

  const { supabase } = gate;

  const [
    users,
    teachers,
    students,
    coursesPub,
    lessonsPub,
    submissions,
    aiCalls,
    completedLessons,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("code_submissions").select("*", { count: "exact", head: true }),
    supabase
      .from("code_submissions")
      .select("*", { count: "exact", head: true })
      .not("ai_suggestion", "is", null),
    supabase
      .from("learning_paths")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  const errors = [
    users.error,
    teachers.error,
    students.error,
    coursesPub.error,
    lessonsPub.error,
    submissions.error,
    aiCalls.error,
    completedLessons.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0]!.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    total_users: users.count ?? 0,
    total_teachers: teachers.count ?? 0,
    total_students: students.count ?? 0,
    total_courses_published: coursesPub.count ?? 0,
    total_lessons_published: lessonsPub.count ?? 0,
    total_code_submissions: submissions.count ?? 0,
    total_ai_calls: aiCalls.count ?? 0,
    total_completed_lessons: completedLessons.count ?? 0,
  });
}
