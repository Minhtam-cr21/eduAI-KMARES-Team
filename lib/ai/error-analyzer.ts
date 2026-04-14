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

const analysisSchema = z.object({
  rootCause: z.string(),
  explanation: z.string(),
  solution: z.string(),
  codeExample: z.string().optional(),
  preventionTip: z.string(),
  debugSteps: z.array(z.string()),
});

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
    extra += `\nInput mẫu / stdin gợi ý:\n${opts.inputExample.trim()}\n`;
  if (opts.expectedOutput?.trim())
    extra += `\nOutput mong đợi (đề bài):\n${opts.expectedOutput.trim()}\n`;
  if (opts.extraContext?.trim())
    extra += `\nBối cảnh thêm (file / dự án):\n${opts.extraContext.trim()}\n`;

  return `Ngôn ngữ lập trình: ${language}

Code học sinh:
\`\`\`
${code}
\`\`\`

Thông báo lỗi / stderr / stdout (có thể gồm traceback):
${signal || "(Không có thông tin — hãy phân tích code và đưa lời khuyên chung.)"}
${extra}

Hãy phân tích như giảng viên thực tế: nguyên nhân gốc rễ (cơ chế), giải thích đơn giản, cách sửa cụ thể, ví dụ code ngắn nếu giúp học sinh, cách phòng tránh, và danh sách bước debug.

Trả về DUY NHẤT một JSON hợp lệ (không markdown bọc ngoài):
{
  "rootCause": "string (tiếng Việt)",
  "explanation": "string (tiếng Việt)",
  "solution": "string (tiếng Việt)",
  "codeExample": "string tùy chọn — đoạn code minh họa",
  "preventionTip": "string (tiếng Việt)",
  "debugSteps": ["bước 1", "bước 2", ...]
}`;
}

const AI_SYSTEM = `Bạn là giảng viên lập trình chuyên nghiệp, giải thích lỗi bằng tiếng Việt rõ ràng, có cấu trúc, thực tiễn. Luôn trả về JSON đúng schema, không thêm văn bản ngoài JSON.`;

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
      temperature: 0.45,
      max_tokens: 1800,
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
      temperature: 0.45,
      max_tokens: 1800,
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
      if (a) return { analysis: a, source: "openai" };
    } catch (e) {
      console.error("[error-analyzer] OpenAI:", e);
    }
    try {
      const a = await analyzeWithDeepseek(code, language, opts);
      if (a) return { analysis: a, source: "deepseek" };
    } catch (e) {
      console.error("[error-analyzer] DeepSeek:", e);
    }
  }

  const signal = buildSignal(opts.stderr, opts.stdout);
  return {
    analysis: analyzeHeuristic(code, signal, language, opts),
    source: "heuristic" as const,
  };
}

export function formatErrorAnalysisMarkdown(a: ErrorAnalysis): string {
  const steps = a.debugSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const ex = a.codeExample?.trim()
    ? `\n## Ví dụ code\n\n\`\`\`\n${a.codeExample.trim()}\n\`\`\`\n`
    : "";
  return `## Nguyên nhân gốc rễ

${a.rootCause}

## Giải thích

${a.explanation}

## Cách sửa

${a.solution}
${ex}
## Phòng tránh

${a.preventionTip}

## Bước debug gợi ý

${steps}`;
}

function analyzeHeuristic(
  code: string,
  error: string,
  language: string,
  opts: AnalyzeCodeErrorOptions
): ErrorAnalysis {
  const low = error.toLowerCase();
  const lang = language.toLowerCase();

  if (/eoferror|eof when reading a line/i.test(error)) {
    return {
      rootCause:
        "Python đang cố đọc dữ liệu từ stdin (ví dụ `input()`) nhưng không còn dòng nào để đọc — thường gặp khi chạy code mà không cung cấp đủ input hoặc stdin rỗng.",
      explanation:
        "Khi bạn gọi `input()`, trình thông dịch chờ một dòng văn bản. Nếu môi trường chạy không gửi thêm dữ liệu (ô stdin trống, hoặc thiếu dòng so với số lần gọi `input()`), Python báo **EOFError** (hết luồng nhập).",
      solution: `Kiểm tra số lần gọi \`input()\` và đảm bảo stdin có đủ dòng. Trong phòng luyện, nhập đúng input mẫu (mỗi giá trị một dòng nếu đề yêu cầu).${
        opts.inputExample?.trim()
          ? `\n\n**Gợi ý từ đề:** thử dán vào ô Input:\n\`\`\`\n${opts.inputExample.trim()}\n\`\`\``
          : ""
      }`,
      codeExample: `try:
    a = int(input())
    b = int(input())
    print(a + b)
except EOFError:
    print("Thiếu dữ liệu stdin — hãy nhập đủ số dòng vào ô Input trước khi chạy.")`,
      preventionTip:
        "Đếm số lần `input()` và khớp với định dạng đề bài; khi test local, dùng file input hoặc dán stdin mẫu trước khi Run.",
      debugSteps: [
        "Đếm trong code có bao nhiêu lệnh `input()` (hoặc `sys.stdin.readline`).",
        "So sánh với input mẫu trong đề — có đủ số dòng không?",
        "Trên IDE/phòng luyện, điền ô stdin rồi chạy lại.",
        "Tạm thời `print('ok')` sau mỗi `input()` để xem chương trình dừng ở đâu.",
      ],
    };
  }

  if (/nosuchelementexception|scanner.*next/i.test(low) && lang.includes("java")) {
    return {
      rootCause:
        "Java đang đọc từ stdin (Scanner/System.in) nhưng không còn token hoặc dòng tiếp theo — tương tự EOFError trong Python.",
      explanation:
        "Khi gọi `scanner.nextInt()`, `nextLine()`, v.v. mà stdin hết dữ liệu, runtime ném NoSuchElementException.",
      solution:
        "Cung cấp đủ dòng vào stdin khi chạy. Kiểm tra thứ tự đọc (đôi khi `nextLine()` sau số bị nuốt dòng newline).",
      codeExample: `Scanner sc = new Scanner(System.in);
if (!sc.hasNextInt()) {
    System.err.println("Thiếu input số nguyên");
    return;
}
int a = sc.nextInt();`,
      preventionTip: "Dùng `hasNext()`, `hasNextInt()` trước khi đọc khi input có thể thiếu.",
      debugSteps: [
        "Kiểm tra ô stdin có đúng format đề không.",
        "In ra từng giá trị đọc được để xác định chỗ hết input.",
        "Đọc kỹ chỗ dùng nextLine sau nextInt.",
      ],
    };
  }

  if (/nameerror/i.test(error)) {
    return {
      rootCause:
        "Trình thông dịch gặp tên (biến, hàm) chưa được gán hoặc chưa import trong phạm vi hiện tại.",
      explanation:
        "Python/Java/C++ đều cần biết tên trước khi dùng. Sai chính tả, nhầm phạm vi (scope), hoặc quên import/module sẽ gây lỗi tên.",
      solution:
        "Tìm dòng traceback chỉ ra tên lỗi. Khai báo biến trước khi dùng; kiểm tra import (`import math`), hoặc `self`/instance trong OOP.",
      codeExample:
        lang.includes("python")
          ? `# Sai: print(x) khi chưa có x\nx = int(input())\nprint(x)`
          : "// Khai báo biến trước khi dùng trong cùng scope",
      preventionTip: "Dùng IDE highlight tên chưa định nghĩa; đặt tên rõ ràng, tránh trùng với built-in.",
      debugSteps: [
        "Đọc dòng NameError — tên nào bị lỗi?",
        "Search tên đó trong file: đã gán/import chưa?",
        "Kiểm tra indent (Python) có làm biến nằm ngoài scope không?",
      ],
    };
  }

  if (/indentationerror|unexpected indent/i.test(error)) {
    return {
      rootCause: "Các khối lệnh Python không thụt đầu dòng nhất quán (spaces/tabs lẫn lộn hoặc sai cấp).",
      explanation:
        "Python dùng thụt dòng thay cho `{}`. Một dòng trong `if`/`for`/`def` phải thụt hơn dòng mở khối.",
      solution:
        "Chọn một kiểu (thường 4 spaces), bỏ tab; chỉnh lại toàn khối sau `if`, `for`, `def`.",
      preventionTip: "Bật 'render whitespace' trong editor; format file trước khi nộp.",
      debugSteps: [
        "Xem traceback chỉ dòng nào 'unexpected indent'.",
        "So sánh thụt dòng dòng trên/dưới.",
        "Đảm bảo sau `:` luôn có khối thụt vào.",
      ],
    };
  }

  if (/syntaxerror/i.test(error)) {
    return {
      rootCause: "Mã nguồn vi phạm quy tắc cú pháp — parser không thể hiểu cấu trúc câu lệnh.",
      explanation:
        "Thiếu dấu `)`, `]`, `:`; ghép chuỗi sai; từ khóa sai vị trí; hoặc lỗi cú pháp ngôn ngữ cụ thể (Python/Java/C++).",
      solution:
        "Đọc dòng traceback (file + dòng). Kiểm tra cặp ngoặc, dấu hai chấm sau điều kiện Python, chấm phẩy C++/Java.",
      preventionTip: "Chạy từng đoạn nhỏ; dùng linter/IDE để bắt lỗi sớm.",
      debugSteps: [
        "Đọc thông báo SyntaxError — thường có mũi tên chỉ vị trí.",
        "Kiểm tra dòng trước đó: thiếu đóng ngoặc?",
        "So sánh với ví dụ mẫu đúng cú pháp.",
      ],
    };
  }

  if (/typeerror/i.test(error)) {
    return {
      rootCause: "Thao tác không hợp lệ giữa các kiểu dữ liệu (ví dụ cộng `str` với `int`, gọi không phải hàm).",
      explanation:
        "Mỗi phép toán/hàm mong đợi kiểu nhất định. Truyền sai kiểu sẽ gây TypeError (Python) hoặc tương đương ở ngôn ngữ khác.",
      solution:
        "Ép kiểu rõ ràng: `int()`, `float()`, `str()`; kiểm tra kiểu trước khi tính toán; đọc kỹ thông báo lỗi (operand types).",
      codeExample: "x = int(input())  # thay vì input() rồi cộng trực tiếp với int",
      preventionTip: "In `type(x)` khi nghi ngờ; validate input trước khi xử lý.",
      debugSteps: [
        "Đọc TypeError — toán hạng nào sai kiểu?",
        "Trace ngược biến đó được gán từ đâu.",
        "Thêm ép kiểu hoặc parse đúng định dạng.",
      ],
    };
  }

  if (/valueerror/i.test(error)) {
    return {
      rootCause: "Giá trị đúng kiểu container nhưng nội dung không hợp lệ (ví dụ `int('abc')`, chuyển base sai).",
      explanation:
        "`int()` cần chuỗi là số; parse ngày/format sai cũng có thể gây ValueError.",
      solution:
        "Kiểm tra chuỗi input trước khi ép kiểu; dùng try/except hoặc `.strip()` loại khoảng trắng; validate regex.",
      codeExample: `s = input().strip()
if s.isdigit():
    n = int(s)
else:
    print("Không phải số hợp lệ")`,
      preventionTip: "Luôn xử lý input 'bẩn' từ người dùng hoặc file.",
      debugSteps: [
        "In repr(s) để thấy ký tự ẩn.",
        "Thử parse thủ công từng phần.",
        "Đối chiếu với định dạng đề bài.",
      ],
    };
  }

  if (/indexerror|keyerror/i.test(error)) {
    return {
      rootCause: "Truy cập chỉ số list/tuple ngoài phạm vi, hoặc khóa không tồn tại trong dict.",
      explanation:
        "IndexError: index < 0 hoặc >= len. KeyError: key không có trong dict (Python).",
      solution:
        "Kiểm tra `len`, dùng `.get()` cho dict; lặp bằng `for k, v in d.items()`; xác nhận index sau split/tokenize.",
      codeExample: "x = d.get('key', default)",
      preventionTip: "Không giả định độ dài mảng; kiểm tra sau `split()`.",
      debugSteps: [
        "In len(list) và index đang dùng.",
        "Kiểm tra dict có key bằng `in`.",
        "Xem input có đủ phần tử sau khi tách không.",
      ],
    };
  }

  if (/zerodivisionerror|division by zero/i.test(low)) {
    return {
      rootCause: "Phép chia hoặc modulo cho 0.",
      explanation: "Toán học không định nghĩa chia cho 0; runtime chặn và báo lỗi.",
      solution: "Trước khi chia, kiểm tra mẫu `if b != 0`; với float, so sánh epsilon nếu cần.",
      preventionTip: "Với input bài toán, luôn xét trường hợp biên m = 0.",
      debugSteps: [
        "Tìm biểu thức có `/` hoặc `%`.",
        "In giá trị mẫu số trước phép chia.",
        "Thêm nhánh xử lý khi mẫu = 0 theo yêu cầu đề.",
      ],
    };
  }

  if (/time limit|timeout|tle|timed out/i.test(low)) {
    return {
      rootCause: "Chương trình chạy quá lâu — thường do vòng lặp vô hạn hoặc độ phức tạp quá lớn.",
      explanation:
        "Judge hoặc sandbox giới hạn thời gian CPU. Vòng `while True` không thoát, hoặc thuật toán O(n²) với n quá lớn sẽ bị TLE.",
      solution:
        "Kiểm tra điều kiện thoát vòng lặp; giảm độ phức tạp; tránh `input()` trong vòng lặp không cần thiết trên môi trường chấm bài tự động.",
      preventionTip: "Ước lượng độ phức tạp; dùng pen & paper với n lớn.",
      debugSteps: [
        "Tìm vòng lặp while/for sâu nhất.",
        "Chạy tay với input nhỏ xem có dừng không.",
        "Thêm biến đếm số vòng để phát hiện vô hạn.",
      ],
    };
  }

  if (/memory|out of memory|std::bad_alloc/i.test(low)) {
    return {
      rootCause: "Cấp phát bộ nhớ quá lớn hoặc rò rỉ — thường do mảng/list khổng lồ hoặc đệ quy sâu.",
      explanation: "Giới hạn RAM của process bị vượt.",
      solution:
        "Giảm kích thước cấu trúc dữ liệu; dùng generator/stream; C++ tránh copy vector lớn không cần thiết.",
      preventionTip: "Ước lượng bộ nhớ: n * sizeof(type).",
      debugSteps: [
        "Tìm khai báo mảng/list với n từ input.",
        "Kiểm tra đệ quy có base case không.",
        "Giảm bản sao dữ liệu (reference/move).",
      ],
    };
  }

  if (/segmentation fault|sigsegv/i.test(low)) {
    return {
      rootCause: "Truy cập bộ nhớ không hợp lệ (C/C++): con trỏ lạc, vượt biên mảng, string chưa kết thúc '\\0'.",
      explanation: "UB sanitizer hoặc OS báo SIGSEGV khi đọc/ghi ngoài vùng nhớ được cấp.",
      solution: "Kiểm tra index < n; khởi tạo con trỏ; dùng `std::vector`, `at()` để bắt biên; valgrind/gdb local.",
      preventionTip: "Tránh raw pointer khi chưa quen; ưu tiên RAII/STL.",
      debugSteps: [
        "Comment từng khối để khoanh vùng dòng lỗi.",
        "In index trước mỗi truy cập mảng.",
        "Chạy với `-fsanitize=address` nếu có toolchain.",
      ],
    };
  }

  if (/filenotfounderror|errno 2|no such file/i.test(low)) {
    return {
      rootCause: "Đường dẫn file không tồn tại hoặc working directory khác với mong đợi.",
      explanation: "Mở đọc/ghi file mà path sai hoặc file chưa được tạo.",
      solution: "Dùng đường dẫn tuyệt đối hoặc kiểm tra `os.path.exists`; trên sandbox có thể không có file local.",
      preventionTip: "Trong bài tập online, thường dùng stdin thay vì file.",
      debugSteps: [
        "In ra path đang mở.",
        "Kiểm tra cwd của runner.",
        "Đọc đề — có cho phép file không?",
      ],
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
      rootCause:
        "Chương trình chạy không lỗi runtime nhưng kết quả stdout không khớp output mong đợi của đề.",
      explanation: `Bạn in ra:\n\`\`\`\n${opts.stdout.trim().slice(0, 500)}\n\`\`\`\nTrong khi đề gợi ý:\n\`\`\`\n${opts.expectedOutput.trim().slice(0, 500)}\n\`\`\`\nChênh lệch có thể do format (xuống dòng, khoảng trắng), thuật toán sai, hoặc thiếu case.`,
      solution:
        "So sánh từng dòng; dùng `strip()`/`rstrip()` nếu đề cho phép; kiểm tra kiểu in (số vs chuỗi), làm tròn số thực.",
      preventionTip: "Đọc kỹ format output: có dòng trống cuối không, in thừa text debug không.",
      debugSteps: [
        "Copy stdout và expected vào diff tool.",
        "In từng biến trung gian.",
        "Thử input mẫu nhỏ tay tính kết quả đúng.",
      ],
    };
  }

  const snippet = error.slice(0, 400);
  const ctxTrim = opts.extraContext?.trim();
  const ctxBlock = ctxTrim
    ? `\n\n**Bối cảnh thêm:**\n\`\`\`\n${ctxTrim.length > 2000 ? `${ctxTrim.slice(0, 2000)}\n…` : ctxTrim}\n\`\`\``
    : "";
  return {
    rootCause:
      "Phân tích heuristic: chương trình báo lỗi hoặc kết quả không như mong đợi; cần đọc traceback / thông báo gốc để khoanh vùng.",
    explanation: `Tóm tắt tín hiệu lỗi (có thể gồm nhiều dòng):\n\n\`\`\`text\n${snippet || "(Không có stderr/stdout — kiểm tra logic hoặc input)"}\n\`\`\`\n\nHãy đọc **dòng đầu** của traceback: tên lỗi + thông điệp; dòng tiếp theo thường chỉ file và số dòng (Python) hoặc vị trí tương đương.${ctxBlock}`,
    solution: `1) Xác định **loại lỗi** (runtime vs biên dịch). 2) Mở đúng **số dòng** được trích. 3) Kiểm tra **input**, **kiểu dữ liệu**, **điều kiện vòng lặp**. 4) So với đề bài: thiếu stdin / sai format output?${
      opts.inputExample?.trim()
        ? `\n\n**Input mẫu từ đề:**\n\`\`\`\n${opts.inputExample.trim()}\n\`\`\``
        : ""
    }`,
    preventionTip:
      "Chạy từng bước nhỏ; thêm log có kiểm soát; đọc traceback từ dưới lên (Python) để thấy chỗ gọi của bạn.",
    debugSteps: [
      "Sao chép toàn bộ stderr vào notepad, tìm tên lỗi (Exception, Error).",
      "Mở file tại dòng được chỉ — sửa và chạy lại.",
      "Thử input tối thiểu tái hiện lỗi.",
      "Nếu không có traceback, in các biến quan trọng trước nhánh nghi ngờ.",
      "Khi có API key LLM, bật phân tích AI để diễn giải sâu hơn.",
    ],
  };
}
