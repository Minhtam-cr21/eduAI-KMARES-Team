/**
 * Seed published courses + lessons (Bước 7b).
 * Cần SUPABASE_SERVICE_ROLE_KEY trong .env.local (hoặc env) để bỏ qua RLS.
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
    "Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY để seed khóa học."
  );
  process.exit(1);
}

const supabase = createClient(url, key);

type SeedCourse = {
  title: string;
  description: string;
  category: string;
  course_type: "skill" | "role";
  lessons: { title: string; content: string; order_index: number }[];
};

const catalog: SeedCourse[] = [
  {
    title: "C++ cơ bản",
    description: "Nhập môn C++: biến, vòng lặp, hàm.",
    category: "C++",
    course_type: "skill",
    lessons: [
      { title: "Giới thiệu", content: "C++ là gì, toolchain.", order_index: 0 },
      { title: "Biến & kiểu", content: "int, float, string.", order_index: 1 },
      { title: "Vòng lặp", content: "for, while.", order_index: 2 },
      { title: "Hàm", content: "Định nghĩa và gọi hàm.", order_index: 3 },
    ],
  },
  {
    title: "Java OOP",
    description: "Lớp, đối tượng, kế thừa.",
    category: "Java",
    course_type: "skill",
    lessons: [
      { title: "JVM & Hello World", content: "Chạy chương trình Java.", order_index: 0 },
      { title: "Class & Object", content: "Thuộc tính, phương thức.", order_index: 1 },
      { title: "Kế thừa", content: "extends, @Override.", order_index: 2 },
    ],
  },
  {
    title: "SQL thực hành",
    description: "SELECT, JOIN, aggregate.",
    category: "SQL",
    course_type: "skill",
    lessons: [
      { title: "SELECT cơ bản", content: "WHERE, ORDER BY.", order_index: 0 },
      { title: "JOIN", content: "INNER, LEFT.", order_index: 1 },
      { title: "GROUP BY", content: "HAVING, COUNT.", order_index: 2 },
      { title: "Subquery", content: "Truy vấn lồng.", order_index: 3 },
    ],
  },
  {
    title: "Python cho automation",
    description: "Script, file, thư viện phổ biến.",
    category: "Python",
    course_type: "skill",
    lessons: [
      { title: "Cài đặt & pip", content: "Môi trường ảo.", order_index: 0 },
      { title: "File & JSON", content: "Đọc ghi file.", order_index: 1 },
      { title: "Requests", content: "Gọi HTTP đơn giản.", order_index: 2 },
    ],
  },
  {
    title: "Prompt engineering",
    description: "Viết prompt rõ ràng, few-shot, chain-of-thought.",
    category: "Prompt engineering",
    course_type: "skill",
    lessons: [
      { title: "Nguyên tắc cơ bản", content: "Rõ vai trò, ngữ cảnh.", order_index: 0 },
      { title: "Few-shot", content: "Cho ví dụ trong prompt.", order_index: 1 },
      { title: "Đánh giá output", content: "Iterative refinement.", order_index: 2 },
    ],
  },
  {
    title: "Frontend hiện đại",
    description: "HTML/CSS/JS, React cơ bản.",
    category: "Frontend",
    course_type: "role",
    lessons: [
      { title: "HTML & semantic", content: "Cấu trúc trang.", order_index: 0 },
      { title: "CSS layout", content: "Flexbox.", order_index: 1 },
      { title: "JavaScript ES6", content: "Arrow, destructuring.", order_index: 2 },
      { title: "React components", content: "Props, state.", order_index: 3 },
      { title: "Fetch API", content: "Gọi REST.", order_index: 4 },
    ],
  },
  {
    title: "Backend API",
    description: "REST, validation, auth cơ bản.",
    category: "Backend",
    course_type: "role",
    lessons: [
      { title: "HTTP & REST", content: "Methods, status codes.", order_index: 0 },
      { title: "Router & handler", content: "Tách route.", order_index: 1 },
      { title: "Validation", content: "Input schema.", order_index: 2 },
    ],
  },
  {
    title: "Fullstack mini app",
    description: "Kết nối FE + BE.",
    category: "Fullstack",
    course_type: "role",
    lessons: [
      { title: "Kiến trúc", content: "Tách layer.", order_index: 0 },
      { title: "API contract", content: "JSON schema.", order_index: 1 },
      { title: "Deploy gợi ý", content: "Env, build.", order_index: 2 },
    ],
  },
];

async function seed() {
  for (const c of catalog) {
    const { data: existing } = await supabase
      .from("courses")
      .select("id")
      .eq("title", c.title)
      .maybeSingle();

    let courseId: string;
    if (existing?.id) {
      console.log("Skip (đã có):", c.title);
      courseId = existing.id;
    } else {
      const { data: ins, error } = await supabase
        .from("courses")
        .insert({
          title: c.title,
          description: c.description,
          course_type: c.course_type,
          category: c.category,
          teacher_id: null,
          status: "published",
        })
        .select("id")
        .single();
      if (error || !ins) {
        console.error("Insert course failed:", c.title, error?.message);
        continue;
      }
      courseId = ins.id;
      console.log("Created course:", c.title, courseId);
    }

    const { data: existingLessons } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("course_id", courseId)
      .limit(1);

    if (existingLessons && existingLessons.length > 0) {
      console.log("  Lessons already exist, skip.");
      continue;
    }

    for (const L of c.lessons) {
      const { error: le } = await supabase.from("course_lessons").insert({
        course_id: courseId,
        title: L.title,
        content: L.content,
        order_index: L.order_index,
        status: "published",
        created_by: null,
      });
      if (le) {
        console.error("  Lesson insert failed:", L.title, le.message);
      }
    }
    console.log("  Inserted", c.lessons.length, "lessons.");
  }
}

seed()
  .then(() => {
    console.log("Done seed-courses.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
