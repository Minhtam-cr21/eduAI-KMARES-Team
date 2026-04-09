/**
 * Seed 7 khóa học mẫu + bài học (C++, SQL, Prompt, Frontend, Backend, Fullstack, FullStack Vibe Coding).
 * Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local
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
      if (!process.env[key]) {
        process.env[key] = val;
      }
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
  console.error(
    "Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function seed() {
  console.log("🌱 Bắt đầu seed dữ liệu khóa học...");

  const { data: teacher } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  const { data: admin } = teacher
    ? { data: null }
    : await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

  const owner = teacher ?? admin ?? null;
  if (!owner) {
    throw new Error(
      "Chưa có giáo viên hoặc admin. Hãy tạo ít nhất 1 tài khoản teacher hoặc admin trước."
    );
  }

  const courses = [
    {
      title: "Lập trình C++ cơ bản",
      description: "Nhập môn C++ từ zero đến hàm, con trỏ.",
      course_type: "skill" as const,
      category: "C++",
      teacher_id: owner.id,
      status: "published" as const,
    },
    {
      title: "SQL từ cơ bản đến nâng cao",
      description: "Truy vấn, JOIN, subquery, index.",
      course_type: "skill",
      category: "SQL",
      teacher_id: owner.id,
      status: "published",
    },
    {
      title: "Prompt Engineering cơ bản",
      description: "Cách viết prompt hiệu quả cho AI.",
      course_type: "skill",
      category: "Prompt engineering",
      teacher_id: owner.id,
      status: "published",
    },
    {
      title: "Frontend cơ bản",
      description: "HTML, CSS, JavaScript, React cơ bản.",
      course_type: "role",
      category: "Frontend",
      teacher_id: owner.id,
      status: "published",
    },
    {
      title: "Backend cơ bản",
      description: "Node.js, Express, REST API, Database.",
      course_type: "role",
      category: "Backend",
      teacher_id: owner.id,
      status: "published",
    },
    {
      title: "Fullstack cơ bản",
      description: "Kết hợp frontend + backend, dự án hoàn chỉnh.",
      course_type: "role",
      category: "Fullstack",
      teacher_id: owner.id,
      status: "published",
    },
    {
      title: "FullStack Vibe Coding",
      description:
        "Làm fullstack theo phong cách vibe: mô tả ý tưởng, AI hỗ trợ code, lặp nhanh đến MVP.",
      course_type: "role",
      category: "Vibe Coding",
      teacher_id: owner.id,
      status: "published",
    },
  ];

  for (const course of courses) {
    const { data: existing, error: findError } = await supabase
      .from("courses")
      .select("id")
      .eq("title", course.title)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) {
      const { error } = await supabase.from("courses").insert(course);
      if (error) throw error;
      console.log(`✅ Đã tạo khóa học: ${course.title}`);
    } else {
      console.log(`⏩ Khóa học đã tồn tại: ${course.title}`);
    }
  }

  const { data: createdCourses, error: listError } = await supabase
    .from("courses")
    .select("id, title")
    .in(
      "title",
      courses.map((c) => c.title)
    );
  if (listError) throw listError;

  const lessonsByCourse: Record<
    string,
    { title: string; content: string; order_index: number }[]
  > = {
    "Lập trình C++ cơ bản": [
      {
        title: "Bài 1: Biến, kiểu dữ liệu, nhập xuất",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
      {
        title: "Bài 2: Vòng lặp và câu điều kiện",
        content: "Nội dung bài 2: ...",
        order_index: 2,
      },
    ],
    "SQL từ cơ bản đến nâng cao": [
      {
        title: "Bài 1: SELECT, WHERE, ORDER BY",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
      {
        title: "Bài 2: JOIN nhiều bảng",
        content: "Nội dung bài 2: ...",
        order_index: 2,
      },
    ],
    "Prompt Engineering cơ bản": [
      {
        title: "Bài 1: Cấu trúc prompt hiệu quả",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
    ],
    "Frontend cơ bản": [
      {
        title: "Bài 1: HTML/CSS cơ bản",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
    ],
    "Backend cơ bản": [
      {
        title: "Bài 1: Node.js và Express",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
    ],
    "Fullstack cơ bản": [
      {
        title: "Bài 1: Kết nối frontend với backend",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
    ],
    "FullStack Vibe Coding": [
      {
        title: "Bài 1: Từ spec ngắn đến MVP với AI pair programming",
        content: "Nội dung bài 1: ...",
        order_index: 1,
      },
    ],
  };

  for (const course of createdCourses ?? []) {
    const lessons = lessonsByCourse[course.title];
    if (!lessons) continue;
    for (const lesson of lessons) {
      const { data: existingLesson } = await supabase
        .from("course_lessons")
        .select("id")
        .eq("course_id", course.id)
        .eq("title", lesson.title)
        .maybeSingle();
      if (!existingLesson) {
        const { error } = await supabase.from("course_lessons").insert({
          course_id: course.id,
          title: lesson.title,
          content: lesson.content,
          order_index: lesson.order_index,
          status: "published",
          created_by: owner.id,
        });
        if (error) throw error;
        console.log(`  ✅ Đã thêm bài: ${lesson.title} vào ${course.title}`);
      } else {
        console.log(`  ⏩ Bài đã tồn tại: ${lesson.title}`);
      }
    }
  }

  console.log("🎉 Seed hoàn tất!");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
