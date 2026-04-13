import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const generatedSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  input_example: z.string().optional().default(""),
  output_example: z.string().optional().default(""),
  initial_code_template: z.string().optional().default(""),
});

export type GeneratedExercisePayload = z.infer<typeof generatedSchema>;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const FALLBACK: Record<
  string,
  Omit<GeneratedExercisePayload, "title"> & { title: string }
> = {
  "python-easy": {
    title: "Tổng hai số",
    description:
      "Đọc hai số nguyên từ stdin (mỗi số một dòng), in ra tổng của chúng.",
    input_example: "3\n5\n",
    output_example: "8\n",
    initial_code_template: "a = int(input())\nb = int(input())\nprint(a + b)\n",
  },
  "python-medium": {
    title: "Đếm từ trong chuỗi",
    description:
      "Đọc một dòng chứa các từ cách nhau bởi khoảng trắng, in số lượng từ.",
    input_example: "hello world edu ai\n",
    output_example: "4\n",
    initial_code_template: "s = input().strip()\nprint(len(s.split()))\n",
  },
  "python-hard": {
    title: "Số Fibonacci thứ n",
    description:
      "Đọc n (0 ≤ n ≤ 45), in F(n) với F(0)=0, F(1)=1.",
    input_example: "10\n",
    output_example: "55\n",
    initial_code_template: "n = int(input())\n# TODO\n",
  },
  "java-easy": {
    title: "In Hello",
    description:
      "Viết chương trình in ra dòng chữ `Hello EduAI` (không cần đọc stdin).",
    input_example: "",
    output_example: "Hello EduAI\n",
    initial_code_template:
      "public class Main {\n  public static void main(String[] args) {\n    // TODO\n  }\n}\n",
  },
  "java-medium": {
    title: "Tổng mảng",
    description:
      "Dòng 1: n. Dòng 2: n số nguyên. In tổng.",
    input_example: "3\n1 2 3\n",
    output_example: "6\n",
    initial_code_template:
      "import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // TODO\n  }\n}\n",
  },
  "java-hard": {
    title: "Đảo chuỗi",
    description: "Đọc một dòng, in chuỗi đảo ngược (giữ ký tự và khoảng trắng).",
    input_example: "abc\n",
    output_example: "cba\n",
    initial_code_template:
      "import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    // TODO\n  }\n}\n",
  },
  "cpp-easy": {
    title: "In số lớn hơn",
    description: "Đọc hai số nguyên, in số lớn hơn.",
    input_example: "4 9\n",
    output_example: "9\n",
    initial_code_template:
      "#include <iostream>\nusing namespace std;\nint main() {\n  // TODO\n  return 0;\n}\n",
  },
  "cpp-medium": {
    title: "Tổng n số",
    description: "Dòng 1: n. Dòng 2: n số. In tổng.",
    input_example: "4\n1 2 3 4\n",
    output_example: "10\n",
    initial_code_template:
      "#include <iostream>\nusing namespace std;\nint main() {\n  // TODO\n  return 0;\n}\n",
  },
  "cpp-hard": {
    title: "GCD hai số",
    description: "Đọc a, b (dương), in GCD(a,b).",
    input_example: "48 18\n",
    output_example: "6\n",
    initial_code_template:
      "#include <iostream>\nusing namespace std;\nint main() {\n  // TODO\n  return 0;\n}\n",
  },
};

function fallbackKey(
  language: "python" | "java" | "cpp",
  difficulty: "easy" | "medium" | "hard"
): string {
  return `${language}-${difficulty}`;
}

function parseOpenAiJson(content: string): unknown {
  const t = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const jsonStr = fence ? fence[1].trim() : t;
  return JSON.parse(jsonStr);
}

/**
 * Gọi OpenAI sinh bài tập; trả null nếu thiếu key / lỗi mạng / JSON không hợp lệ.
 */
export async function generateExerciseWithOpenAI(
  language: "python" | "java" | "cpp",
  difficulty: "easy" | "medium" | "hard",
  signal?: AbortSignal
): Promise<GeneratedExercisePayload | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const userPrompt = `Hãy tạo một bài tập lập trình ${language} cấp độ ${difficulty} với mô tả rõ ràng, input mẫu, output mong đợi, và mã khởi đầu gợi ý.
Trả về DUY NHẤT một object JSON (tiếng Việt cho title, description), không markdown, không văn bản ngoài JSON:
{
  "title": "string",
  "description": "string (có thể markdown nhẹ)",
  "input_example": "string",
  "output_example": "string",
  "initial_code_template": "string"
}`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Bạn là giáo viên lập trình. Chỉ trả về JSON hợp lệ theo yêu cầu.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal,
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn("[practice/generate] OpenAI HTTP", res.status, text.slice(0, 200));
      return null;
    }

    const raw = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = raw.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = generatedSchema.safeParse(parseOpenAiJson(content));
    if (!parsed.success) {
      console.warn("[practice/generate] schema", parsed.error.flatten());
      return null;
    }
    return parsed.data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[practice/generate]", msg);
    return null;
  }
}

export async function pickExistingExerciseFromDb(
  supabase: SupabaseClient,
  language: "python" | "java" | "cpp",
  difficulty: "easy" | "medium" | "hard"
): Promise<GeneratedExercisePayload | null> {
  const { data, error } = await supabase
    .from("practice_exercises")
    .select(
      "title, description, initial_code, input_example, output_example, language, difficulty"
    )
    .eq("language", language)
    .eq("difficulty", difficulty)
    .limit(40);

  if (error || !data?.length) return null;

  const row = data[Math.floor(Math.random() * data.length)]!;
  return {
    title: String(row.title),
    description: String(row.description ?? ""),
    input_example: String(row.input_example ?? ""),
    output_example: String(row.output_example ?? ""),
    initial_code_template: String(row.initial_code ?? ""),
  };
}

export function getStaticFallback(
  language: "python" | "java" | "cpp",
  difficulty: "easy" | "medium" | "hard"
): GeneratedExercisePayload {
  const hit = FALLBACK[fallbackKey(language, difficulty)];
  if (hit) return { ...hit };
  return { ...FALLBACK["python-easy"]! };
}
