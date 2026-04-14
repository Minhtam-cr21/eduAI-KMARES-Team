import OpenAI from "openai";
import { z } from "zod";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

export type AnalysisSource = "openai" | "deepseek" | "heuristic";

export interface ErrorAnalysis {
  rootCause: string;
  explanation: string;
  solution: string;
  codeExample?: string;
  preventionTip: string;
  debugSteps: string[];
}

const analysisSchema = z
  .object({
    rootCause: z.string(),
    explanation: z.string().optional(),
    solution: z.string(),
    codeExample: z.string().optional(),
    preventionTip: z.string().optional(),
    debugSteps: z.array(z.string()).optional(),
  })
  .transform((s) => ({
    rootCause: s.rootCause,
    explanation: s.explanation ?? "",
    solution: s.solution,
    codeExample: s.codeExample,
    preventionTip: s.preventionTip ?? "",
    debugSteps: s.debugSteps ?? [],
  }));

export interface AnalyzeCodeErrorOptions {
  stderr?: string;
  stdout?: string;
  inputExample?: string;
  expectedOutput?: string;
  /** File dự án / bối cảnh thêm (chủ yếu cho prompt AI) */
  extraContext?: string;
}

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function isErrorAnalyzerAiConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim()
  );
}

/** Chuỗi dùng để khớp heuristic (ưu tiên stderr). */
function buildSignal(stderr?: string, stdout?: string): string {
  const e = stderr?.trim() ?? "";
  const o = stdout?.trim() ?? "";
  if (e && o) return `${e}\n--- stdout ---\n${o}`;
  return e || o || "";
}

function parseAnalysisJson(raw: string): ErrorAnalysis | null {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const jsonStr = fence ? fence[1].trim() : t;
  try {
    const parsed: unknown = JSON.parse(jsonStr);
    const r = analysisSchema.safeParse(parsed);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

function buildAiUserPrompt(
  code: string,
  language: string,
  signal: string,
  opts: AnalyzeCodeErrorOptions
): string {
  let extra = "";
  if (opts.inputExample?.trim())
    extra += `\nInput mẫu:\n${opts.inputExample.trim().slice(0, 400)}\n`;
  if (opts.expectedOutput?.trim())
    extra += `\nOutput mong đợi:\n${opts.expectedOutput.trim().slice(0, 400)}\n`;
  if (opts.extraContext?.trim())
    extra += `\nBối cảnh:\n${opts.extraContext.trim().slice(0, 800)}\n`;

  return `Ngôn ngữ: ${language}

Code:
\`\`\`
${code.slice(0, 3500)}
\`\`\`

Lỗi / output (không nhắc lại nguyên văn dài):
${signal.slice(0, 1500) || "(Không có — gợi ý sửa nhanh theo code.)"}
${extra}

Yêu cầu: trả lời CỰC NGẮN (khoảng 5–7 dòng tổng cộng), tiếng Việt, giọng thẳng — không định nghĩa dài, không lặp traceback.
- rootCause: đúng 1 câu, nói đúng chỗ sai.
- solution: 1–2 câu + có thể 2–4 gạch đầu dòng ngắn (- ...). Chỉ việc cần làm.
- codeExample: chỉ khi thật cần (≤ 5 dòng code), không thì "".
- explanation, preventionTip: luôn "" ; debugSteps: luôn [].

JSON duy nhất:
{"rootCause":"","explanation":"","solution":"","codeExample":"","preventionTip":"","debugSteps":[]}`;
}

const AI_SYSTEM = `Bạn là trợ lý sửa lỗi code. Trả về đúng một JSON object, không markdown ngoài JSON. Ngắn gọn, súc tích, ưu tiên hành động cụ thể.`;

async function analyzeWithOpenAI(
  code: string,
  language: string,
  opts: AnalyzeCodeErrorOptions
): Promise<ErrorAnalysis | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const signal = buildSignal(opts.stderr, opts.stdout);
  const user = buildAiUserPrompt(code, language, signal, opts);
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const response = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: AI_SYSTEM },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      max_tokens: 220,
      response_format: { type: "json_object" },
    },
    { signal: AbortSignal.timeout(28_000) }
  );

  const content = response.choices[0]?.message?.content?.trim() ?? "";
  return parseAnalysisJson(content);
}

async function analyzeWithDeepseek(
  code: string,
  language: string,
  opts: AnalyzeCodeErrorOptions
): Promise<ErrorAnalysis | null> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) return null;

  const signal = buildSignal(opts.stderr, opts.stdout);
  const user = buildAiUserPrompt(code, language, signal, opts);
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: AI_SYSTEM },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      max_tokens: 220,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(28_000),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[error-analyzer] DeepSeek HTTP:", res.status, text.slice(0, 300));
    return null;
  }
  const data = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  return parseAnalysisJson(content);
}

/**
 * Phân tích lỗi / kết quả chạy: OpenAI → DeepSeek → heuristic nâng cao.
 */
export async function analyzeCodeError(
  code: string,
  language: string,
  opts: AnalyzeCodeErrorOptions = {}
): Promise<{ analysis: ErrorAnalysis; source: AnalysisSource }> {
  if (isErrorAnalyzerAiConfigured()) {
    try {
      const a = await analyzeWithOpenAI(code, language, opts);
      if (a) return { analysis: toConciseAnalysis(a), source: "openai" };
    } catch (e) {
      console.error("[error-analyzer] OpenAI:", e);
    }
    try {
      const a = await analyzeWithDeepseek(code, language, opts);
      if (a) return { analysis: toConciseAnalysis(a), source: "deepseek" };
    } catch (e) {
      console.error("[error-analyzer] DeepSeek:", e);
    }
  }

  const signal = buildSignal(opts.stderr, opts.stdout);
  return {
    analysis: toConciseAnalysis(analyzeHeuristic(code, signal, language, opts)),
    source: "heuristic" as const,
  };
}

/** Giữ gợi ý trong ~5–7 dòng đọc, bỏ phần phụ. */
function truncateBlock(text: string, maxLines: number, maxChars: number): string {
  const t = text.trim().replace(/\r\n/g, "\n");
  const lines = t.split("\n").slice(0, maxLines);
  let out = lines.join("\n").trim();
  if (out.length > maxChars) {
    out = out.slice(0, maxChars).trimEnd();
    const sp = out.lastIndexOf(" ");
    if (sp > maxChars * 0.55) out = out.slice(0, sp).trimEnd();
    out += "…";
  }
  return out || "—";
}

export function toConciseAnalysis(a: ErrorAnalysis): ErrorAnalysis {
  const ce = a.codeExample?.trim();
  const codeOk = ce && ce.length <= 360 ? ce : undefined;
  return {
    rootCause: truncateBlock(a.rootCause, 2, 200),
    explanation: "",
    solution: truncateBlock(a.solution, 8, 560),
    codeExample: codeOk,
    preventionTip: "",
    debugSteps: [],
  };
}

export function formatErrorAnalysisMarkdown(a: ErrorAnalysis): string {
  const c = toConciseAnalysis(a);
  const ex = c.codeExample?.trim()
    ? `\n\`\`\`\n${c.codeExample.trim()}\n\`\`\`\n`
    : "";
  return `**Nguyên nhân:** ${c.rootCause}\n\n**Cách sửa:**\n${c.solution}${ex}`;
}

function analyzeHeuristic(
  _code: string,
  error: string,
  language: string,
  opts: AnalyzeCodeErrorOptions
): ErrorAnalysis {
  const low = error.toLowerCase();
  const lang = language.toLowerCase();

  if (/eoferror|eof when reading a line/i.test(error)) {
    const lines = opts.inputExample?.trim().split(/\n/).map((l) => l.trim()).filter(Boolean) ?? [];
    const sample = lines.length >= 2 ? lines.slice(0, 6).join("\n") : "3\n5";
    return {
      rootCause: "Chương trình cần nhập dữ liệu nhưng không có input.",
      explanation: "",
      solution: `Dán vào ô Input (mỗi giá trị một dòng):\n\n${sample}`,
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/nosuchelementexception|scanner.*next/i.test(low) && lang.includes("java")) {
    return {
      rootCause: "Scanner đọc stdin nhưng hết dữ liệu (thiếu dòng/token).",
      explanation: "",
      solution:
        "- Bổ sung đủ dòng vào ô Input.\n- Sau `nextInt()` nếu gọi `nextLine()` hãy cân nhắc bỏ qua dòng trống hoặc đổi thứ tự đọc.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/nameerror/i.test(error)) {
    return {
      rootCause: "Dùng tên biến/hàm chưa khai báo, sai chính tả, hoặc sai scope.",
      explanation: "",
      solution:
        "- Xem traceback: tên nào bị lỗi.\n- Khai báo/import trước khi dùng; kiểm tra indent Python (biến có nằm trong đúng khối không).",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/indentationerror|unexpected indent/i.test(error)) {
    return {
      rootCause: "Thụt dòng Python không đều hoặc sai cấp sau `:` / `if` / `def`.",
      explanation: "",
      solution:
        "- Thống nhất 4 spaces (tránh tab).\n- Dòng trong khối phải thụt hơn dòng `if`/`for`/`def`.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/syntaxerror/i.test(error)) {
    return {
      rootCause: "Sai cú pháp (thiếu `)`, `]`, `:`, v.v.).",
      explanation: "",
      solution:
        "- Mở đúng dòng traceback chỉ ra.\n- Kiểm tra cặp ngoặc và `:` sau `if`/`def` (Python); `;` nếu là C++/Java.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/typeerror/i.test(error)) {
    return {
      rootCause: "Thao tác giữa kiểu không tương thích (ví dụ `str` + `int`).",
      explanation: "",
      solution:
        "- Đọc dòng lỗi: toán hạng nào sai kiểu.\n- Ép kiểu: `int()`, `float()`, `str()` trước khi tính.",
      codeExample: lang.includes("python") ? "x = int(input())" : "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/valueerror/i.test(error)) {
    return {
      rootCause: "Giá trị không parse được (ví dụ `int('abc')`, format sai).",
      explanation: "",
      solution:
        "- `.strip()` input trước khi `int()`/`float()`.\n- Kiểm tra chuỗi có đúng định dạng đề không.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/indexerror|keyerror/i.test(error)) {
    return {
      rootCause: "Index ngoài phạm vi list/tuple hoặc key không có trong dict.",
      explanation: "",
      solution:
        "- Kiểm tra `len` trước khi truy cập `[i]`.\n- Dict: dùng `.get(k)` hoặc `if k in d`.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/zerodivisionerror|division by zero/i.test(low)) {
    return {
      rootCause: "Chia (hoặc %) cho 0.",
      explanation: "",
      solution: "- Kiểm tra mẫu số `!= 0` trước khi chia.\n- Xử lý case biên theo đề.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/time limit|timeout|tle|timed out/i.test(low)) {
    return {
      rootCause: "Chạy quá lâu — thường vòng lặp vô hạn hoặc thuật toán chậm.",
      explanation: "",
      solution:
        "- Kiểm tra `while`/`for` có thoát không.\n- Giảm độ phức tạp; tránh lặp không cần `input()`.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/memory|out of memory|std::bad_alloc/i.test(low)) {
    return {
      rootCause: "Dùng quá nhiều RAM (mảng quá lớn / đệ quy sâu).",
      explanation: "",
      solution:
        "- Giảm kích thước cấu trúc lưu trữ.\n- C++: tránh copy vector lớn; ưu tiên tham chiếu.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/segmentation fault|sigsegv/i.test(low)) {
    return {
      rootCause: "C/C++: truy cập ngoài mảng hoặc con trỏ lỗi.",
      explanation: "",
      solution:
        "- Kiểm tra index < kích thước.\n- Dùng `std::vector` + `at()`; chạy local với sanitizer nếu có.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  if (/filenotfounderror|errno 2|no such file/i.test(low)) {
    return {
      rootCause: "File/path không tồn tại hoặc cwd sai.",
      explanation: "",
      solution:
        "- Kiểm tra đường dẫn và `exists` trước khi mở.\n- Trên môi trường chấm bài, ưu tiên stdin thay vì file.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  // So khớp output với đề (heuristic nhẹ)
  if (
    opts.expectedOutput?.trim() &&
    opts.stdout?.trim() &&
    !opts.stderr?.trim() &&
    opts.stdout.trim() !== opts.expectedOutput.trim()
  ) {
    return {
      rootCause: "Chạy được nhưng output không khớp đề (sai logic hoặc format).",
      explanation: "",
      solution:
        "- So dòng từng dòng với đề; chú ý xuống dòng cuối / khoảng trắng.\n- In biến trung gian để so với tay.",
      codeExample: "",
      preventionTip: "",
      debugSteps: [],
    };
  }

  const firstLine = error.trim().split("\n")[0]?.slice(0, 120) ?? "";
  return {
    rootCause: firstLine
      ? `Lỗi: ${firstLine}${error.length > 120 ? "…" : ""}`
      : "Chưa có thông báo lỗi rõ — kiểm tra input và logic.",
    explanation: "",
    solution:
      "- Đọc dòng đầu traceback (tên lỗi + file/dòng).\n- Sửa đúng dòng đó; thử input nhỏ.\n- Thiếu stdin? Điền ô Input đủ dòng.",
    codeExample: "",
    preventionTip: "",
    debugSteps: [],
  };
}
