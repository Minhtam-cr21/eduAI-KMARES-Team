/**
 * One-shot migration: legacy courses → edu_* (Edu V2).
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Run: npx tsx scripts/migrate-to-new-schema.ts
 * (tsx không tự load .env.local — script tự đọc giống seed-courses.)
 *
 * Idempotent-ish: skips courses that already have an edu_course with same title + instructor.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServiceRoleClient } from "../lib/supabase/service-role";

function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    /* file missing */
  }
}

function mapLevel(level: string | null | undefined): "beginner" | "intermediate" | "advanced" {
  if (level === "intermediate") return "intermediate";
  if (level === "advanced") return "advanced";
  return "beginner";
}

function mapLessonType(
  t: string | null | undefined
): "lecture" | "interactive" | "code-along" | "quiz" | "project" {
  if (t === "quiz") return "quiz";
  if (t === "video") return "lecture";
  return "lecture";
}

async function main() {
  const supabase = createServiceRoleClient();

  const { data: courses, error: cErr } = await supabase
    .from("courses")
    .select(
      "id, title, description, teacher_id, status, thumbnail_url, duration_hours, total_lessons, level, category_id"
    )
    .order("created_at", { ascending: true });

  if (cErr) {
    console.error(cErr.message);
    process.exit(1);
  }

  const { data: categories } = await supabase
    .from("course_categories")
    .select("id, name");

  const catName = new Map<string, string>(
    (categories ?? []).map((r) => [r.id as string, r.name as string])
  );

  let migrated = 0;
  for (const c of courses ?? []) {
    const teacherId = c.teacher_id as string | null;
    if (!teacherId) {
      console.warn("Skip course (no teacher_id):", c.id, c.title);
      continue;
    }

    const title = String(c.title ?? "").trim();
    if (!title) continue;

    const { data: existing } = await supabase
      .from("edu_courses")
      .select("id")
      .eq("instructor_id", teacherId)
      .eq("title", title)
      .maybeSingle();
    if (existing) {
      console.log("Skip (exists):", title);
      continue;
    }

    const categoryLabel =
      c.category_id && catName.has(c.category_id as string)
        ? catName.get(c.category_id as string)!
        : null;

    const { data: eduCourse, error: insCErr } = await supabase
      .from("edu_courses")
      .insert({
        title,
        description: (c.description as string | null) ?? null,
        instructor_id: teacherId,
        thumbnail_url: (c.thumbnail_url as string | null) ?? null,
        duration_hours: (c.duration_hours as number | null) ?? 0,
        total_lessons: 0,
        level: mapLevel(c.level as string | null),
        category: categoryLabel,
        is_published: c.status === "published",
        is_archived: false,
        language: "vi",
      })
      .select("id")
      .single();

    if (insCErr || !eduCourse) {
      console.error("Insert edu_course failed:", title, insCErr?.message);
      continue;
    }

    const eduCourseId = eduCourse.id as string;

    const { data: chapters } = await supabase
      .from("course_chapters")
      .select("id, title, description, order_index")
      .eq("course_id", c.id as string)
      .order("order_index", { ascending: true });

    const { data: lessons } = await supabase
      .from("course_lessons")
      .select(
        "id, title, content, video_url, code_template, order_index, chapter_id, type, status, time_estimate"
      )
      .eq("course_id", c.id as string)
      .order("order_index", { ascending: true });

    const lessonRows = (lessons ?? []).filter((l) => l.status === "published");
    if (lessonRows.length === 0) {
      console.log("No published lessons:", title);
      migrated++;
      continue;
    }

    const modIdByChapter = new Map<string | null, string>();
    let defaultModId: string | null = null;

    const ensureDefaultModule = async () => {
      if (defaultModId) return defaultModId;
      const { data: m, error } = await supabase
        .from("edu_modules")
        .insert({
          course_id: eduCourseId,
          title: "Noi dung khoa hoc",
          description: null,
          order: 0,
        })
        .select("id")
        .single();
      if (error || !m) throw new Error(error?.message ?? "module");
      defaultModId = m.id as string;
      modIdByChapter.set(null, defaultModId);
      return defaultModId;
    };

    let modOrder = 0;
    if ((chapters ?? []).length === 0) {
      await ensureDefaultModule();
    } else {
      for (const ch of chapters ?? []) {
        const { data: m, error } = await supabase
          .from("edu_modules")
          .insert({
            course_id: eduCourseId,
            title: String(ch.title ?? "Chuong"),
            description: (ch.description as string | null) ?? null,
            order: modOrder++,
          })
          .select("id")
          .single();
        if (error || !m) {
          console.error("module insert", error?.message);
          continue;
        }
        modIdByChapter.set(ch.id as string, m.id as string);
      }
    }

    for (const le of lessonRows) {
      const chId = (le.chapter_id as string | null) ?? null;
      let modId = chId ? modIdByChapter.get(chId) : modIdByChapter.get(null);
      if (!modId) modId = await ensureDefaultModule();

      const { data: eduLes, error: lErr } = await supabase
        .from("edu_lessons")
        .insert({
          module_id: modId,
          title: String(le.title ?? "Bai hoc"),
          description: null,
          order: (le.order_index as number | null) ?? 0,
          lesson_type: mapLessonType(le.type as string | null),
          duration_minutes: (le.time_estimate as number | null) ?? 0,
        })
        .select("id")
        .single();

      if (lErr || !eduLes) {
        console.error("lesson insert", lErr?.message);
        continue;
      }

      const eduLessonId = eduLes.id as string;
      let contentOrder = 0;

      const videoUrl = (le.video_url as string | null)?.trim();
      if (videoUrl) {
        await supabase.from("edu_lesson_contents").insert({
          lesson_id: eduLessonId,
          content_type: "video",
          order: contentOrder++,
          content_data: { title: "Video", url: videoUrl },
        });
      }

      const body = (le.content as string | null)?.trim();
      if (body) {
        await supabase.from("edu_lesson_contents").insert({
          lesson_id: eduLessonId,
          content_type: "text",
          order: contentOrder++,
          content_data: { title: "Noi dung", body },
        });
      }

      const code = (le.code_template as string | null)?.trim();
      if (code) {
        await supabase.from("edu_lesson_contents").insert({
          lesson_id: eduLessonId,
          content_type: "code_editor",
          order: contentOrder++,
          content_data: {
            title: "Code",
            language: "python",
            starter_code: code,
          },
        });
      }

      const { data: quizRow } = await supabase
        .from("quizzes")
        .select("id, title, questions, passing_score")
        .eq("lesson_id", le.id as string)
        .eq("is_published", true)
        .maybeSingle();

      if (quizRow) {
        const qs = quizRow.questions as unknown;
        await supabase.from("edu_lesson_contents").insert({
          lesson_id: eduLessonId,
          content_type: "quiz",
          order: contentOrder++,
          content_data: {
            title: quizRow.title ?? "Quiz",
            passing_score: quizRow.passing_score ?? 70,
            questions: Array.isArray(qs) ? qs : [],
          },
        });
      }
    }

    console.log("Migrated:", title, "->", eduCourseId);
    migrated++;
  }

  console.log("Done. Migrated courses:", migrated);
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function requireEnvOrExit() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local next to package.json."
    );
    process.exit(1);
  }
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    !process.env.SUPABASE_SERVICE_ROLE_JWT_KEY?.trim()
  ) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_JWT_KEY) in .env.local."
    );
    process.exit(1);
  }
}

requireEnvOrExit();

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
