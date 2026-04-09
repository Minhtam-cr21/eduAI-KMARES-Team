import type { AIDebugResponse } from "./types";

/**
 * Phân tích nội bộ — không gọi API, không throw.
 */
export function ruleBasedAnalysis(
  code: string,
  error: string,
  language: string
): AIDebugResponse {
  const lang = language.trim().toLowerCase();
  const err = error.toLowerCase();

  const isCpp =
    lang === "cpp" || lang === "c++" || lang === "cxx";
  const isJs =
    lang === "javascript" || lang === "js" || lang === "node";
  const isPy = lang === "python" || lang === "py";

  // C++ memory: new + return trước delete / thiếu delete
  if (isCpp && /\bnew\b/.test(code)) {
    const hasDelete = /\bdelete\b/.test(code);
    const earlyReturn =
      /\breturn\b/.test(code) &&
      (() => {
        const ni = code.indexOf("new");
        const ri = code.indexOf("return", ni);
        if (ri === -1) return false;
        const slice = code.slice(ni, ri);
        return !slice.includes("delete");
      })();
    if (!hasDelete || earlyReturn) {
      return {
        errorType: "Critical",
        title: "Rò rỉ bộ nhớ (new/delete không cân đối)",
        visualDiff: {
          before: "int* p = new int(1);\nif (err) return 1;\ndelete p;",
          after:
            "#include <memory>\nauto p = std::make_unique<int>(1);\nif (err) return 1;",
        },
        rootCause:
          "Cấp phát heap bằng `new` nhưng không `delete` trên mọi nhánh thoát — vi phạm RAII; bộ nhớ heap của process không được trả lại cho đến khi kết thúc tiến trình.",
        solution:
          "Dùng `std::unique_ptr`, `std::shared_ptr` hoặc `std::vector` để tự động giải phóng khi ra khỏi scope.",
        impact:
          "**1 tuần:** có thể chưa lộ trên test nhỏ. **1 tháng:** tiến trình dài làm tăng RSS. **1 năm:** nguy cơ OOM hoặc crash khi tải cao.",
        improvements: [
          "Bật AddressSanitizer/LeakSanitizer khi build debug",
          "Ưu tiên container chuẩn thư viện thay con trỏ thô",
        ],
      };
    }
  }

  // JS async: fetch + return sớm / .then rồi return sai
  if (isJs && /\bfetch\s*\(/.test(code)) {
    const compact = code.replace(/\s+/g, " ");
    const badSyncReturn =
      /\bfetch\s*\([^)]*\)\s*;\s*return\s+(?!fetch)/.test(compact) ||
      (/\.then\s*\(/.test(code) &&
        /\breturn\b/.test(code) &&
        !/\bawait\b/.test(code) &&
        /return\s+data\b/.test(code));
    if (badSyncReturn || (!/\bawait\b/.test(code) && /\breturn\s+/.test(code))) {
      return {
        errorType: "Critical",
        title: "Xử lý bất đồng bộ sai (fetch/Promise)",
        visualDiff: {
          before: "fetch(url);\nreturn result;",
          after:
            "const res = await fetch(url);\nconst result = await res.json();\nreturn result;",
        },
        rootCause:
          "`fetch` trả Promise; mã đồng bộ chạy tiếp trước khi I/O hoàn tất — giá trị đọc ngay thường là `undefined` hoặc Promise chưa settle.",
        solution:
          "Dùng `async/await` hoặc `return fetch(...).then(r => r.json())` — đảm bảo chuỗi Promise hoàn chỉnh.",
        impact:
          "**1 tuần:** bug dữ liệu trên UI nhỏ. **1 tháng:** lỗi downstream undefined. **1 năm:** nợ kỹ thuật khó tái hiện.",
        improvements: ["Luôn await hoặc return đúng Promise chain"],
      };
    }
  }

  // Python mutable default
  if (isPy && /def\s+\w+\s*\([^)]*=\s*\[\s*\]/.test(code)) {
    return {
      errorType: "Warning",
      title: "Tham mặc định kiểu list (mutable)",
      visualDiff: {
        before: "def f(x, items=[]):\n    items.append(x)",
        after: "def f(x, items=None):\n    if items is None:\n        items = []\n    items.append(x)",
      },
      rootCause:
        "Đối tượng list mặc định được khởi tạo một lần khi định nghĩa hàm và dùng chung giữa các lần gọi.",
      solution: "Dùng `None` làm mặc định và tạo list mới trong thân hàm.",
      impact:
        "**1 tuần:** test đơn có thể pass. **1 tháng:** trạng thái dính giữa các lần gọi. **1 năm:** lỗi dữ liệu khó debug.",
      improvements: ["Dùng immutable default hoặc factory"],
    };
  }

  if (isPy && /def\s+\w+\s*\([^)]*=\s*\{\s*\}/.test(code)) {
    return {
      errorType: "Warning",
      title: "Tham mặc định kiểu dict (mutable)",
      visualDiff: {
        before: "def f(x, d={}):\n    d['k'] = x",
        after: "def f(x, d=None):\n    if d is None:\n        d = {}\n    d['k'] = x",
      },
      rootCause: "Tương tự list — dict mặc định dùng chung giữa các lần gọi.",
      solution: "Dùng `None` và khởi tạo dict mới trong hàm.",
      impact:
        "**1 tuần:** có thể chưa lộ. **1 tháng:** key bị ghi đè chéo giữa caller. **1 năm:** bug state khó tái hiện.",
      improvements: ["Factory pattern cho default mutable"],
    };
  }

  // SyntaxError chung
  if (
    err.includes("syntaxerror") ||
    err.includes("syntax error") ||
    err.includes("indentationerror") ||
    err.includes("expected") ||
    err.includes("unexpected")
  ) {
    const hint = err.includes("unexpected")
      ? "Kiểm tra ký tự thừa/thiếu gần vị trí báo lỗi."
      : "Đối chiếu số dòng/cột trong thông báo với editor.";
    return {
      errorType: "Critical",
      title: "Lỗi cú pháp",
      visualDiff: isPy
        ? { before: "print('x'", after: "print('x')" }
        : isJs
          ? { before: "const x =", after: "const x = 1;" }
          : { before: "int x", after: "int x;" },
      rootCause:
        "Trình phân tích cú pháp không dựng được cây cú pháp hợp lệ — thường do token thiếu/thừa hoặc thụt lề sai.",
      solution: `Đọc kỹ message: "${error.slice(0, 200)}". ${hint} Sửa từng lỗi một rồi biên dịch/chạy lại.`,
      impact:
        "**1 tuần–1 năm:** mã không chạy được cho đến khi sửa — không có hậu quả runtime vì không vượt qua giai đoạn parse.",
      improvements: ["Bật linter và format tự động"],
    };
  }

  const first = code.split("\n").find((l) => l.trim().length > 0) ?? code;
  return {
    errorType: "Warning",
    title: "Phân tích heuristic (rule-based)",
    visualDiff: {
      before: first.slice(0, 120),
      after: "// Rà soát điều kiện biên, kiểu dữ liệu và thông báo lỗi đầy đủ",
    },
    rootCause:
      "Không khớp pattern cụ thể — có thể lỗi logic, runtime, hoặc môi trường. Phân tích dựa trên chuỗi lỗi và đoạn code.",
    solution:
      `Đọc traceback/log: "${error.slice(0, 300)}". Thu nhỏ testcase, thêm assert/log tại điểm nghi ngờ.`,
    impact:
      "**1 tuần:** tốn thời gian debug nếu không có test. **1 tháng:** lỗi lặp lại khi dữ liệu đặc biệt. **1 năm:** nợ kỹ thuật nếu không có review.",
    improvements: ["Viết unit test cho case lỗi", "Bật phân tích AI khi có API key"],
  };
}
