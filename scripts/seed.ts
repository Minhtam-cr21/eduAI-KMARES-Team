import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/* Tự load .env.local — không cần dotenv-cli */
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
    /* file không tồn tại — bỏ qua */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
  console.error(
    "Đảm bảo .env.local nằm ở thư mục gốc dự án (cùng cấp package.json)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding topic 'Python cơ bản'…");

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .insert({
      title: "Python cơ bản",
      description:
        "Khóa học nhập môn Python: từ cú pháp đơn giản đến cấu trúc dữ liệu cơ bản.",
      order_index: 1,
      is_published: true,
    })
    .select("id")
    .single();

  if (topicErr) {
    if (topicErr.message.includes("duplicate")) {
      console.log("Topic 'Python cơ bản' đã tồn tại — thử lấy id…");
      const { data: existing } = await supabase
        .from("topics")
        .select("id")
        .eq("title", "Python cơ bản")
        .single();
      if (!existing) {
        console.error("Không tìm được topic đã tồn tại.");
        process.exit(1);
      }
      console.log("Topic id (existing):", existing.id);
      await seedLessons(existing.id);
      return;
    }
    console.error("Topic insert failed:", topicErr.message);
    process.exit(1);
  }

  console.log("Topic created:", topic.id);
  await seedLessons(topic.id);
}

async function seedLessons(topicId: string) {
  console.log("Seeding lessons…");

  const lessons = [
    {
      topic_id: topicId,
      title: "In ra màn hình",
      order_index: 1,
      is_published: true,
      video_url: null,
      content: `# In ra màn hình với print()

Python dùng hàm \`print()\` để hiển thị kết quả.

## Ví dụ

\`\`\`python
print("Xin chào!")
print("Tên tôi là", "EduAI")
print(1 + 2)
\`\`\`

## Giải thích

- \`print("Xin chào!")\` — in chuỗi ký tự.
- Có thể in nhiều giá trị cách nhau bằng dấu phẩy.
- Biểu thức trong \`print()\` sẽ được tính trước khi in.

## Bài tập nhỏ

Viết code in ra:
1. Tên của bạn
2. Kết quả phép tính \`5 * 7\`
`,
    },
    {
      topic_id: topicId,
      title: "Biến và kiểu dữ liệu",
      order_index: 2,
      is_published: true,
      video_url: null,
      content: `# Biến và kiểu dữ liệu

Biến giúp lưu trữ dữ liệu để dùng lại.

## Khai báo biến

\`\`\`python
ten = "An"
tuoi = 16
diem_tb = 8.5
da_dang_ky = True
\`\`\`

## Kiểu dữ liệu phổ biến

| Kiểu     | Ví dụ        | Ghi chú                   |
|----------|-------------|---------------------------|
| \`str\`    | \`"hello"\`   | Chuỗi ký tự               |
| \`int\`    | \`42\`        | Số nguyên                  |
| \`float\`  | \`3.14\`      | Số thực                    |
| \`bool\`   | \`True/False\`| Đúng / Sai                |

## Kiểm tra kiểu

\`\`\`python
print(type(ten))      # <class 'str'>
print(type(tuoi))     # <class 'int'>
\`\`\`

## Bài tập nhỏ

Tạo 3 biến: tên (str), tuổi (int), điểm (float) và in ra bằng \`print()\`.
`,
    },
  ];

  const { error: lessonsErr } = await supabase.from("lessons").insert(lessons);

  if (lessonsErr) {
    if (lessonsErr.message.includes("duplicate")) {
      console.log("Lessons đã tồn tại, bỏ qua.");
    } else {
      console.error("Lessons insert failed:", lessonsErr.message);
      process.exit(1);
    }
  } else {
    console.log(`Inserted ${lessons.length} lessons.`);
  }

  console.log("Seed hoàn tất!");
}

seed();
