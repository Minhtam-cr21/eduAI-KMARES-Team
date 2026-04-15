import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Next.js uses .env.local; default dotenv only reads .env — load both (local first).
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Put them in .env.local or .env at the project root.\n" +
      `  URL: ${url ? "ok" : "missing"} · Service role: ${key ? "ok" : "missing"}`
  );
  process.exit(1);
}

const supabase = createClient(url, key);

type CourseSeed = {
  title: string;
  description: string;
  category_slug: string;
  price: number;
  original_price: number;
  duration_hours: number;
  rating: number;
  level: "beginner" | "intermediate" | "advanced" | "all_levels";
  thumbnail_url: string | null;
  objectives?: string[];
  target_audience?: string;
  what_you_will_learn?: string[];
  lesson_titles: string[];
};

const courses: CourseSeed[] = [
  {
    title: "Lập trình C++ nâng cao",
    description:
      "Khóa C++ nâng cao cho người đã có nền tảng, tập trung STL, template và bộ nhớ.",
    category_slug: "advanced-programming",
    price: 699_000,
    original_price: 900_000,
    duration_hours: 30,
    rating: 4.9,
    level: "advanced",
    thumbnail_url:
      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
    objectives: ["Quản lý bộ nhớ", "Xử lý ngoại lệ", "STL thực chiến"],
    target_audience: "Đã học C++ cơ bản",
    what_you_will_learn: ["Con trỏ nâng cao", "Template", "Đa luồng"],
    lesson_titles: [
      "Ôn tập C++ cốt lõi",
      "Smart pointers và RAII",
      "STL: container & algorithm",
      "Template và meta-programming",
    ],
  },
  {
    title: "Python nâng cao",
    description:
      "Python cho người đã biết cơ bản: async, typing, packaging và thư viện phổ biến.",
    category_slug: "advanced-programming",
    price: 699_000,
    original_price: 900_000,
    duration_hours: 25,
    rating: 4.8,
    level: "advanced",
    thumbnail_url:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80",
    lesson_titles: ["Decorator & context", "Async IO", "Testing", "Packaging"],
  },
  {
    title: "SQL nâng cao",
    description: "Truy vấn phức tạp, index, transaction và tối ưu hiệu năng.",
    category_slug: "advanced-programming",
    price: 699_000,
    original_price: 900_000,
    duration_hours: 20,
    rating: 4.8,
    level: "advanced",
    thumbnail_url:
      "https://images.unsplash.com/photo-1544383835-bda086bc5805?w=800&q=80",
    lesson_titles: ["Join nâng cao", "Index & query plan", "Transaction", "Window functions"],
  },
  {
    title: "Lập trình C++ cơ bản",
    description: "Nền tảng C++: cú pháp, hàm, class, mảng và vòng lặp.",
    category_slug: "basic-programming",
    price: 499_000,
    original_price: 720_000,
    duration_hours: 20,
    rating: 4.9,
    level: "beginner",
    thumbnail_url:
      "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&q=80",
    lesson_titles: ["Giới thiệu & IDE", "Biến, kiểu dữ liệu", "Hàm & OOP cơ bản", "Mảng & vector"],
  },
  {
    title: "Python cho người mới bắt đầu",
    description: "Python từ con số 0: cú pháp, vòng lặp, hàm và xử lý file.",
    category_slug: "basic-programming",
    price: 499_000,
    original_price: 720_000,
    duration_hours: 20,
    rating: 4.9,
    level: "beginner",
    thumbnail_url:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80",
    lesson_titles: ["Cài đặt & REPL", "Biến & điều kiện", "Hàm & module", "List & dict"],
  },
  {
    title: "SQL cho người mới bắt đầu",
    description: "SELECT, WHERE, JOIN, GROUP BY — nền tảng làm việc với database.",
    category_slug: "basic-programming",
    price: 499_000,
    original_price: 720_000,
    duration_hours: 20,
    rating: 4.9,
    level: "beginner",
    thumbnail_url:
      "https://images.unsplash.com/photo-1544383835-bda086bc5805?w=800&q=80",
    lesson_titles: ["Giới thiệu DB", "SELECT & FILTER", "JOIN", "GROUP BY"],
  },
  {
    title: "Thuật toán cơ bản",
    description: "Phức tạp, đệ quy, duyệt, sắp xếp và tìm kiếm.",
    category_slug: "algorithms",
    price: 699_000,
    original_price: 900_000,
    duration_hours: 25,
    rating: 4.9,
    level: "intermediate",
    thumbnail_url:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80",
    lesson_titles: ["Độ phức tạp", "Đệ quy", "Sắp xếp", "Tìm kiếm nhị phân"],
  },
  {
    title: "Giải thuật cho Python",
    description: "Cài đặt thuật toán bằng Python với ví dụ minh họa.",
    category_slug: "algorithms",
    price: 699_000,
    original_price: 900_000,
    duration_hours: 20,
    rating: 4.9,
    level: "intermediate",
    thumbnail_url:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80",
    lesson_titles: ["Cấu trúc dữ liệu", "Two pointers", "BFS/DFS cơ bản", "DP intro"],
  },
  {
    title: "Lộ trình Python A-Z",
    description: "Từ beginner đến ứng dụng thực tế trong một lộ trình dài.",
    category_slug: "basic-programming",
    price: 999_000,
    original_price: 1_620_000,
    duration_hours: 50,
    rating: 4.9,
    level: "all_levels",
    thumbnail_url:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&q=80",
    lesson_titles: [
      "Python Essentials",
      "OOP & packages",
      "File & DB",
      "Mini project web API",
    ],
  },
];

async function seed() {
  const { data: teacher, error: te } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (te || !teacher) {
    throw new Error("No teacher found. Create a teacher account first.");
  }

  const { data: categories, error: ce } = await supabase
    .from("course_categories")
    .select("id, slug, name");

  if (ce || !categories?.length) {
    throw new Error("course_categories missing. Apply migrations.");
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c])) as Record<
    string,
    { id: string; name: string }
  >;

  for (const course of courses) {
    const cat = catMap[course.category_slug];
    if (!cat) {
      console.warn("Skip (no category):", course.title, course.category_slug);
      continue;
    }

    const {
      category_slug: _cs,
      lesson_titles,
      rating,
      original_price,
      ...rest
    } = course;

    const { data: inserted, error: insErr } = await supabase
      .from("courses")
      .insert({
        ...rest,
        category_id: cat.id,
        category: cat.name,
        teacher_id: teacher.id,
        status: "published",
        is_published: true,
        course_type: "skill",
        rating,
        original_price,
        price: course.price,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      console.error("Insert error:", course.title, insErr);
      continue;
    }

    const lessonRows = lesson_titles.map((title, i) => ({
      course_id: inserted.id,
      title,
      order_index: i + 1,
      status: "published" as const,
      content: `Nội dung mẫu: ${title}`,
    }));

    const { error: le } = await supabase.from("course_lessons").insert(lessonRows);
    if (le) {
      console.error("Lessons error:", course.title, le);
    } else {
      console.log("✅", course.title);
    }
  }

  console.log("Seeding completed!");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
