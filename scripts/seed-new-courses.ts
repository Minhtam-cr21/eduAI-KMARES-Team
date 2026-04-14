/**
 * Deletes ALL courses (CASCADE: lessons, enrollments, …) then seeds the Phase 2 catalog.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* skip */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const SAMPLE_VIDEO = "https://www.youtube.com/watch?v=rfscVS0vtbw";

type SeedCourse = {
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  lessons: { title: string; content: string }[];
};

const CATALOG: SeedCourse[] = [
  {
    title: "C++ co ban",
    description: "C++ fundamentals: syntax, functions, arrays, pointers intro.",
    category: "C++",
    thumbnail_url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80",
    lessons: [
      { title: "Intro & toolchain", content: "Install compiler, Hello World, .cpp layout." },
      { title: "Types & I/O", content: "int, float, string, cin/cout, basic operators." },
      { title: "Control flow", content: "if/else, for, while, switch — short drills." },
      { title: "Functions & scope", content: "Definitions, parameters, return, scope." },
    ],
  },
  {
    title: "Java co ban",
    description: "Java OOP basics: classes, objects, collections.",
    category: "Java",
    thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    lessons: [
      { title: "JDK & first program", content: "main, compile/run, println." },
      { title: "Classes & objects", content: "Fields, constructors, methods." },
      { title: "Inheritance & interfaces", content: "extends, implements, polymorphism intro." },
      { title: "Collections", content: "ArrayList, HashMap — simple CRUD patterns." },
    ],
  },
  {
    title: "Python co ban",
    description: "Python for beginners: syntax, data structures, files.",
    category: "Python",
    thumbnail_url: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80",
    lessons: [
      { title: "Setup & scripts", content: "venv, pip, running .py files." },
      { title: "Types & functions", content: "list, dict, def, lambda intro." },
      { title: "Control flow", content: "if, for, list comprehensions basics." },
      { title: "Files & modules", content: "open/with, importing local modules." },
    ],
  },
  {
    title: "SQL co ban",
    description: "Relational queries: SELECT, JOIN, GROUP BY, indexes overview.",
    category: "SQL",
    thumbnail_url: "https://images.unsplash.com/photo-1544383835-bda542bc3a62?w=800&q=80",
    lessons: [
      { title: "Tables & INSERT", content: "Simple schema, PK/FK idea." },
      { title: "SELECT & WHERE", content: "Filters, ORDER BY, LIMIT." },
      { title: "JOINs", content: "INNER/LEFT with users & orders example." },
      { title: "GROUP BY & HAVING", content: "Aggregates and grouping." },
    ],
  },
  {
    title: "Huong dan setup moi truong",
    description: "Git, Node, Python, editor, terminal — prep your machine.",
    category: "Cong cu",
    thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
    lessons: [
      { title: "Shell & PATH", content: "Env vars, running commands on Win/Mac/Linux." },
      { title: "Git basics", content: "clone, branch, commit, push, PR concept." },
      { title: "Editor setup", content: "VS Code / Cursor, formatter, linter." },
      { title: "Docker intro", content: "What containers are, run a sample image." },
    ],
  },
  {
    title: "Ren luyen tu duy",
    description: "Problem decomposition, pseudocode, basic complexity intuition.",
    category: "Tu duy",
    thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80",
    lessons: [
      { title: "Decompose problems", content: "I/O spec, examples by hand, edge cases." },
      { title: "Pseudocode", content: "Plan before coding." },
      { title: "Complexity intuition", content: "Nested loops, rough Big-O examples." },
      { title: "Debug systematically", content: "Logs, breakpoints, narrowing bugs." },
    ],
  },
  {
    title: "Lam quen AI models",
    description: "LLMs, prompting, RAG concepts, safe API usage.",
    category: "AI",
    thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
    lessons: [
      { title: "What is an LLM", content: "Tokens, context window, limitations." },
      { title: "Effective prompts", content: "Roles, output format, few-shot pattern." },
      { title: "RAG overview", content: "Docs, embeddings, retrieve-then-answer." },
      { title: "API keys", content: "Env vars, never commit secrets, quotas." },
    ],
  },
];

async function main() {
  const { data: teacher } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  const { data: admin } = teacher
    ? { data: null as { id: string } | null }
    : await supabase.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();

  const owner = teacher ?? admin;
  if (!owner) {
    throw new Error("Need at least one teacher or admin profile.");
  }

  const { error: delErr } = await supabase
    .from("courses")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;
  console.log("Removed existing courses (cascade).");

  for (const c of CATALOG) {
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .insert({
        title: c.title,
        description: c.description,
        content: c.description,
        course_type: "skill",
        category: c.category,
        teacher_id: owner.id,
        status: "published",
        is_published: true,
        ai_generated: false,
        thumbnail_url: c.thumbnail_url,
        source_file: null,
      })
      .select("id")
      .single();
    if (cErr || !course) throw cErr ?? new Error("insert course");

    const courseId = course.id as string;
    const lessons = c.lessons.map((l, i) => ({
      course_id: courseId,
      title: l.title,
      content: l.content,
      video_url: SAMPLE_VIDEO,
      order_index: i,
      status: "published" as const,
      created_by: owner.id,
    }));

    const { error: lErr } = await supabase.from("course_lessons").insert(lessons);
    if (lErr) throw lErr;
    console.log("Seeded:", c.title, `(${lessons.length} lessons)`);
  }

  console.log("Done seed-new-courses.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
