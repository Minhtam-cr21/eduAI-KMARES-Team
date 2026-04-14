import OpenAI from "openai";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const SYSTEM_PROMPT = `Bạn là một giảng viên lập trình giàu kinh nghiệm, tận tâm. Học sinh gặp lỗi trong code. Nhiệm vụ của bạn: phân tích lỗi, giải thích nguyên nhân gốc rễ, đưa ra hướng sửa cụ thể (không cho code hoàn chỉnh trừ khi thực sự cần thiết), và khuyến khích học sinh tự sửa. Hãy trả lời bằng tiếng Việt, với giọng điệu thân thiện, dễ hiểu, có cấu trúc rõ ràng (nguyên nhân → cách sửa → ví dụ minh họa → lời khuyên). Có thể dùng Markdown (tiêu đề, danh sách, khối code ngắn) khi hợp lý.`;

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function buildObservation(req: CodeAnalysisRequest): string {
  const bits: string[] = [];
  if (req.error?.trim()) bits.push(`Lỗi / stderr:\n${req.error.trim()}`);
  if (req.output?.trim()) bits.push(`Output / stdout:\n${req.output.trim()}`);
  if (bits.length === 0) {
    bits.push(
      "(Chưa có kết quả chạy cụ thể — hãy đọc code và đưa ra nhận xét, lời khuyên luyện tập phù hợp.)"
    );
  }
  return bits.join("\n\n");
}

function buildUserPrompt(req: CodeAnalysisRequest): string {
  const tail = buildObservation(req);
  let block = `Ngôn ngữ: ${req.language}\nCode:\n\`\`\`\n${req.code}\n\`\`\`\n${tail}\n\nHãy phân tích và hướng dẫn học sinh.`;
  if (req.extraContext?.trim()) {
    block += `\n\nBối cảnh thêm:\n${req.extraContext.trim()}`;
  }
  return block;
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  error?: string;
  output?: string;
  /** Ví dụ: file dự án — chỉ dùng từ API khi client gửi context */
  extraContext?: string;
}

async function completionOpenAI(userPrompt: string, signal: AbortSignal): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY missing");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    },
    { signal }
  );

  return completion.choices[0]?.message?.content?.trim() || "";
}

async function completionDeepseekMentor(
  userPrompt: string,
  signal: AbortSignal
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) throw new Error("DEEPSEEK_API_KEY missing");

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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal,
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 400);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      detail = j.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Deepseek ${res.status}: ${detail}`);
  }

  const data = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

/**
 * Phân tích code bằng OpenAI (ưu tiên), sau đó DeepSeek, cuối cùng fallback tĩnh.
 */
export async function analyzeCodeWithAI(req: CodeAnalysisRequest): Promise<string> {
  const userPrompt = buildUserPrompt(req);

  try {
    if (getOpenAI()) {
      const text = await completionOpenAI(userPrompt, AbortSignal.timeout(25_000));
      if (text) return text;
    }
  } catch (e) {
    console.error("[code-mentor] OpenAI failed:", e);
  }

  try {
    const text = await completionDeepseekMentor(
      userPrompt,
      AbortSignal.timeout(25_000)
    );
    if (text) return text;
  } catch (e) {
    console.error("[code-mentor] DeepSeek failed:", e);
  }

  return fallbackAnalysis(req);
}

function fallbackAnalysis({ error, output }: CodeAnalysisRequest): string {
  if (error) {
    if (error.includes("SyntaxError"))
      return `🔍 **Lỗi cú pháp**: ${error}\n\n📌 **Nguyên nhân**: Bạn viết sai cú pháp ở dòng được chỉ định.\n\n🛠 **Cách sửa**: Kiểm tra kỹ các dấu ngoặc, dấu chấm phẩy, câu lệnh. Hãy dùng IDE để tô màu lỗi.\n\n💡 **Ví dụ**: Nếu thiếu dấu ')' ở cuối dòng, hãy thêm vào.\n\n🎓 **Lời khuyên**: Luôn kiểm tra lại code trước khi chạy.`;
    if (error.includes("NameError"))
      return `🔍 **Lỗi tên biến**: ${error}\n\n📌 **Nguyên nhân**: Bạn dùng biến chưa được định nghĩa.\n\n🛠 **Cách sửa**: Đảm bảo bạn đã khai báo biến trước khi dùng, hoặc kiểm tra chính tả.\n\n💡 **Ví dụ**: Thay vì viết \`print(x)\` mà chưa có \`x = 5\`, hãy khai báo \`x\` trước.\n\n🎓 **Lời khuyên**: Đặt tên biến rõ ràng và kiểm tra phạm vi.`;
    if (error.includes("TypeError"))
      return `🔍 **Lỗi kiểu dữ liệu**: ${error}\n\n📌 **Nguyên nhân**: Bạn thực hiện phép toán không hợp lệ giữa các kiểu dữ liệu khác nhau.\n\n🛠 **Cách sửa**: Chuyển đổi kiểu dữ liệu phù hợp trước khi tính toán.\n\n💡 **Ví dụ**: \`int('5') + 3\` thay vì \`'5' + 3\`.\n\n🎓 **Lời khuyên**: Dùng hàm \`type()\` để kiểm tra kiểu dữ liệu.`;
  }
  if (output?.includes("Hello world edu ai")) {
    return `🔍 **Phân tích kết quả chạy**: Code in ra "Hello world edu ai".\n\n📌 **Nhận xét**: Code chạy thành công nhưng không có yêu cầu cụ thể. Hãy xác định rõ bài toán cần giải.\n\n🛠 **Gợi ý**: Nếu bài yêu cầu nhập xuất số, hãy dùng \`input()\` và chuyển đổi kiểu.\n\n🎓 **Lời khuyên**: Luôn đọc kỹ đề bài trước khi code.`;
  }
  return `🔍 **Không xác định được lỗi cụ thể**\n\n📌 **Nguyên nhân**: Hệ thống chưa đủ thông tin hoặc chưa cấu hình API AI (OPENAI / DEEPSEEK).\n\n🛠 **Cách sửa**: Hãy thử chạy code với bộ dữ liệu nhỏ hơn, thêm lệnh in để kiểm tra từng bước.\n\n🎓 **Lời khuyên**: Sử dụng debugger để theo dõi luồng chạy.`;
}

export function isCodeMentorAiConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim()
  );
}
