export type AssessmentQuestion = {
  code: string;
  text: string;
  type: "mbti" | "radio" | "checkbox" | "text";
  options?: { value: string; label: string }[];
  group: "MBTI" | "A" | "B" | "C" | "D";
  required: boolean;
};

const MBTI_CORE: AssessmentQuestion[] = [
  {
    code: "MBTI_1",
    text: "Bạn thích làm việc nhóm, trao đổi nhiều (A) hay thích làm việc một mình, yên tĩnh (B)?",
    type: "mbti",
    options: [
      { value: "E", label: "A - Làm việc nhóm" },
      { value: "I", label: "B - Một mình" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_2",
    text: "Bạn thích học qua thảo luận, nói ra (A) hay thích đọc và suy ngẫm trước (B)?",
    type: "mbti",
    options: [
      { value: "E", label: "A - Thảo luận" },
      { value: "I", label: "B - Suy ngẫm" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_3",
    text: "Bạn thích học theo từng bước cụ thể (A) hay nhìn tổng thể, ý tưởng lớn (B)?",
    type: "mbti",
    options: [
      { value: "S", label: "A - Từng bước" },
      { value: "N", label: "B - Tổng thể" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_4",
    text: "Bạn thích ví dụ thực tế, dễ hình dung (A) hay lý thuyết trừu tượng, khái niệm (B)?",
    type: "mbti",
    options: [
      { value: "S", label: "A - Thực tế" },
      { value: "N", label: "B - Trừu tượng" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_5",
    text: "Bạn quyết định dựa trên logic, phân tích (A) hay cảm xúc, giá trị (B)?",
    type: "mbti",
    options: [
      { value: "T", label: "A - Logic" },
      { value: "F", label: "B - Cảm xúc" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_6",
    text: "Bạn phê bình thẳng thắn, coi trọng sự thật (A) hay thích khích lệ, tránh gây mất lòng (B)?",
    type: "mbti",
    options: [
      { value: "T", label: "A - Thẳng thắn" },
      { value: "F", label: "B - Khích lệ" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_7",
    text: "Bạn thích lên kế hoạch rõ ràng, đúng deadline (A) hay linh hoạt, không gò bó (B)?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Kế hoạch" },
      { value: "P", label: "B - Linh hoạt" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_8",
    text: "Bạn thích kết thúc công việc trước khi nghỉ (A) hay làm nhiều việc cùng lúc, thoải mái (B)?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Kết thúc trước" },
      { value: "P", label: "B - Làm cùng lúc" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_9",
    text: "Bạn thích có lộ trình chi tiết (A) hay chỉ cần mục tiêu chung (B)?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Chi tiết" },
      { value: "P", label: "B - Mục tiêu chung" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_10",
    text: "Bạn thường bắt đầu bài tập sớm (A) hay sát deadline (B)?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Sớm" },
      { value: "P", label: "B - Sát deadline" },
    ],
    group: "MBTI",
    required: true,
  },
];

const MBTI_EXTRA: AssessmentQuestion[] = [
  {
    code: "MBTI_11",
    text: "Bạn được tiếp thêm năng lượng khi (A) gặp gỡ, trò chuyện với nhiều người hay (B) có thời gian yên tĩnh một mình?",
    type: "mbti",
    options: [
      { value: "E", label: "A - Gặp gỡ nhiều người" },
      { value: "I", label: "B - Yên tĩnh một mình" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_12",
    text: "Trong lớp học trực tuyến, bạn thích (A) breakout room thảo luận hay (B) xem bài và tự ghi chú?",
    type: "mbti",
    options: [
      { value: "E", label: "A - Thảo luận nhóm" },
      { value: "I", label: "B - Tự ghi chú" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_13",
    text: "Bạn tin tưởng hơn vào (A) kinh nghiệm và dữ liệu đã có hay (B) khả năng, ý tưởng mới?",
    type: "mbti",
    options: [
      { value: "S", label: "A - Kinh nghiệm, dữ liệu" },
      { value: "N", label: "B - Ý tưởng mới" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_14",
    text: "Khi đọc tài liệu kỹ thuật, bạn chú ý (A) từng bước, cú pháp cụ thể hay (B) kiến trúc, luồng tổng thể?",
    type: "mbti",
    options: [
      { value: "S", label: "A - Chi tiết cụ thể" },
      { value: "N", label: "B - Tổng thể, kiến trúc" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_15",
    text: "Khi nhóm bạn trễ deadline, bạn ưu tiên (A) chỉ ra nguyên nhân khách quan hay (B) cảm nhận và động viên cả nhóm?",
    type: "mbti",
    options: [
      { value: "T", label: "A - Phân tích nguyên nhân" },
      { value: "F", label: "B - Độ viên cảm xúc" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_16",
    text: "Góp ý cho code của bạn, bạn muốn người khác (A) nói thẳng lỗi sai hay (B) khen phần tốt rồi nhẹ nhàng góp ý?",
    type: "mbti",
    options: [
      { value: "T", label: "A - Nói thẳng" },
      { value: "F", label: "B - Nhẹ nhàng" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_17",
    text: "Cuối tuần học tập, bạn thích (A) đã lên lịch cụ thể hay (B) tùy hứng theo cảm hứng?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Lịch cụ thể" },
      { value: "P", label: "B - Tùy hứng" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_18",
    text: "Với đồ án dài, bạn thoải mái khi (A) có checklist và milestone rõ hay (B) còn nhiều hướng mở để khám phá?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Checklist rõ" },
      { value: "P", label: "B - Hướng mở" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_19",
    text: "Gần deadline, bạn thường (A) đã hoàn thành phần lớn hay (B) vẫn chỉnh sửa và thử ý tưởng mới?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Gần xong" },
      { value: "P", label: "B - Vẫn thử ý mới" },
    ],
    group: "MBTI",
    required: true,
  },
  {
    code: "MBTI_20",
    text: "Bạn đóng gói kiến thức theo (A) khung chương trình cố định hay (B) liên kết chủ đề linh hoạt?",
    type: "mbti",
    options: [
      { value: "J", label: "A - Khung cố định" },
      { value: "P", label: "B - Liên kết linh hoạt" },
    ],
    group: "MBTI",
    required: true,
  },
];

const GROUP_A: AssessmentQuestion[] = [
  {
    code: "A1",
    text: "Bạn học lập trình để làm gì?",
    type: "radio",
    options: [
      { value: "web", label: "Web" },
      { value: "data", label: "Data" },
      { value: "game", label: "Game" },
      { value: "mobile", label: "Mobile" },
      { value: "automation", label: "Automation" },
      { value: "other", label: "Khác" },
    ],
    group: "A",
    required: true,
  },
  {
    code: "A2",
    text: "Bạn muốn đạt được gì sau 3 tháng?",
    type: "radio",
    options: [
      { value: "web_basic", label: "Web cơ bản" },
      { value: "data_analysis", label: "Phân tích dữ liệu" },
      { value: "simple_game", label: "Game đơn giản" },
      { value: "mobile_app", label: "App mobile" },
      { value: "automation", label: "Tự động hóa" },
    ],
    group: "A",
    required: true,
  },
  {
    code: "A3",
    text: "Mỗi ngày bạn có thể dành bao nhiêu giờ học?",
    type: "radio",
    options: [
      { value: "<1", label: "Dưới 1 giờ" },
      { value: "1-2", label: "1–2 giờ" },
      { value: "2-4", label: "2–4 giờ" },
      { value: ">4", label: "Trên 4 giờ" },
    ],
    group: "A",
    required: true,
  },
  {
    code: "A4",
    text: "Bạn đã từng học lập trình chưa?",
    type: "radio",
    options: [
      { value: "never", label: "Chưa bao giờ" },
      { value: "self_video", label: "Tự học qua video" },
      { value: "one_course", label: "Đã học một khóa" },
      { value: "small_project", label: "Có project nhỏ" },
    ],
    group: "A",
    required: true,
  },
  {
    code: "A5",
    text: "Môi trường làm việc lý tưởng của bạn trong 3–5 năm tới?",
    type: "radio",
    options: [
      { value: "startup", label: "Startup / sản phẩm mới" },
      { value: "corp", label: "Công ty lớn, quy trình rõ" },
      { value: "freelance", label: "Freelance / remote linh hoạt" },
      { value: "research", label: "Nghiên cứu, lab" },
      { value: "teach", label: "Giảng dạy, mentoring" },
    ],
    group: "A",
    required: true,
  },
  {
    code: "A6",
    text: "Mức độ tự tin khi bắt đầu một công nghệ hoàn toàn mới?",
    type: "radio",
    options: [
      { value: "low", label: "Thấp — cần hướng dẫn chi tiết" },
      { value: "medium", label: "Trung bình" },
      { value: "high", label: "Cao — thích tự mò" },
      { value: "very_high", label: "Rất cao — đọc doc là đủ" },
    ],
    group: "A",
    required: true,
  },
];

const GROUP_B: AssessmentQuestion[] = [
  {
    code: "B1",
    text: "Bạn thích học qua hình thức nào nhất?",
    type: "radio",
    options: [
      { value: "video", label: "Video" },
      { value: "text", label: "Tài liệu viết" },
      { value: "practice", label: "Bài tập ngay" },
      { value: "examples", label: "Ví dụ thực tế" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B2",
    text: "Khi gặp khó, bạn thường làm gì?",
    type: "radio",
    options: [
      { value: "google", label: "Google / tài liệu" },
      { value: "friend", label: "Hỏi bạn bè" },
      { value: "ai", label: "Hỏi AI" },
      { value: "review", label: "Xem lại lý thuyết" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B3",
    text: "Bạn có thích lộ trình học cố định không?",
    type: "radio",
    options: [
      { value: "very", label: "Rất thích" },
      { value: "maybe", label: "Có thể" },
      { value: "no", label: "Không" },
      { value: "self", label: "Tự tạo lộ trình" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B4",
    text: "Bạn muốn bài tập ở mức độ nào?",
    type: "radio",
    options: [
      { value: "easy", label: "Dễ" },
      { value: "medium", label: "Vừa" },
      { value: "challenge", label: "Thử thách" },
      { value: "very_hard", label: "Rất khó" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B5",
    text: "Bạn có thích học nhóm không?",
    type: "radio",
    options: [
      { value: "very", label: "Rất thích" },
      { value: "sometimes", label: "Thỉnh thoảng" },
      { value: "no", label: "Không" },
      { value: "alone", label: "Thích một mình" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B6",
    text: "Bạn muốn nhận nhắc học qua kênh nào?",
    type: "radio",
    options: [
      { value: "email", label: "Email" },
      { value: "telegram", label: "Telegram" },
      { value: "none", label: "Không cần" },
      { value: "inapp", label: "Trong app" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B7",
    text: "Khung giờ học hiệu quả nhất với bạn?",
    type: "radio",
    options: [
      { value: "morning", label: "Sáng" },
      { value: "afternoon", label: "Chiều" },
      { value: "evening", label: "Tối" },
      { value: "night", label: "Khuya" },
    ],
    group: "B",
    required: true,
  },
  {
    code: "B8",
    text: "Bạn ưu tiên học (A) sâu một chủ đề trước khi chuyển hay (B) nhiều chủ đề song song ở mức vừa phải?",
    type: "radio",
    options: [
      { value: "depth", label: "A - Sâu một chủ đề" },
      { value: "breadth", label: "B - Nhiều chủ đề song song" },
    ],
    group: "B",
    required: true,
  },
];

const GROUP_C: AssessmentQuestion[] = [
  {
    code: "C1",
    text: "Bạn biết ngôn ngữ / công nghệ nào? (chọn tất cả đúng)",
    type: "checkbox",
    options: [
      { value: "python", label: "Python" },
      { value: "js", label: "JavaScript" },
      { value: "cpp", label: "C++" },
      { value: "java", label: "Java" },
      { value: "htmlcss", label: "HTML/CSS" },
      { value: "none", label: "Chưa biết gì" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C2",
    text: "Bạn biết Git ở mức nào?",
    type: "radio",
    options: [
      { value: "no", label: "Chưa" },
      { value: "basic", label: "Cơ bản" },
      { value: "proficient", label: "Thành thạo" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C3",
    text: "Khả năng đọc tài liệu kỹ thuật tiếng Anh?",
    type: "radio",
    options: [
      { value: "bad", label: "Kém" },
      { value: "dictionary", label: "Đọc được với từ điển" },
      { value: "basic", label: "Cơ bản" },
      { value: "good", label: "Tốt" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C4",
    text: "Bạn có học đều đặn theo lịch không?",
    type: "radio",
    options: [
      { value: "very_hard", label: "Rất khó duy trì" },
      { value: "sometimes", label: "Thỉnh thoảng" },
      { value: "quite", label: "Khá đều" },
      { value: "very", label: "Rất đều" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C5",
    text: "Khi gặp bug, bạn thích cách nào?",
    type: "radio",
    options: [
      { value: "ai_do", label: "AI gợi ý sửa trực tiếp" },
      { value: "ai_suggest", label: "AI gợi ý hướng" },
      { value: "self", label: "Tự debug" },
      { value: "ask", label: "Nhờ người khác" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C6",
    text: "Kiến thức về cơ sở dữ liệu (SQL, mô hình dữ liệu)?",
    type: "radio",
    options: [
      { value: "none", label: "Chưa có" },
      { value: "basic", label: "Biết SELECT cơ bản" },
      { value: "sql_ok", label: "JOIN, index" },
      { value: "advanced", label: "Thiết kế schema, tối ưu" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C7",
    text: "Tư duy logic / toán cho lập trình?",
    type: "radio",
    options: [
      { value: "weak", label: "Yếu, cần luyện nhiều" },
      { value: "medium", label: "Trung bình" },
      { value: "strong", label: "Khá mạnh" },
      { value: "very_strong", label: "Rất mạnh (thi đấu, v.v.)" },
    ],
    group: "C",
    required: true,
  },
  {
    code: "C8",
    text: "Bạn đã từng hoàn thành project cá nhân (ngoài bài tập lớp) chưa?",
    type: "radio",
    options: [
      { value: "never", label: "Chưa" },
      { value: "small", label: "1–2 project nhỏ" },
      { value: "several", label: "Nhiều project nhỏ/trung" },
      { value: "production", label: "Có sản phẩm dùng thật / deploy" },
    ],
    group: "C",
    required: true,
  },
];

const GROUP_D: AssessmentQuestion[] = [
  {
    code: "D1",
    text: "Bạn thích làm loại ứng dụng nào nhất?",
    type: "radio",
    options: [
      { value: "game", label: "Game" },
      { value: "website", label: "Website" },
      { value: "mobile", label: "App mobile" },
      { value: "automation", label: "Tự động hóa" },
      { value: "data", label: "Data / AI" },
      { value: "other", label: "Khác" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D2",
    text: "Ngoài code, bạn đam mê lĩnh vực nào?",
    type: "radio",
    options: [
      { value: "art", label: "Nghệ thuật" },
      { value: "music", label: "Âm nhạc" },
      { value: "sports", label: "Thể thao" },
      { value: "science", label: "Khoa học" },
      { value: "business", label: "Kinh doanh" },
      { value: "cooking", label: "Ẩm thực" },
      { value: "travel", label: "Du lịch" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D3",
    text: "Bạn muốn công nghệ giúp giải quyết vấn đề nào?",
    type: "radio",
    options: [
      { value: "environment", label: "Môi trường" },
      { value: "education", label: "Giáo dục" },
      { value: "health", label: "Sức khỏe" },
      { value: "traffic", label: "Giao thông" },
      { value: "security", label: "An ninh" },
      { value: "other", label: "Khác" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D4",
    text: "Mức độ hứng thú với AI / machine learning?",
    type: "radio",
    options: [
      { value: "very", label: "Rất thích" },
      { value: "normal", label: "Bình thường" },
      { value: "no", label: "Không hứng thú" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D5",
    text: "Muốn học thêm ngoại ngữ nào (phục vụ nghề nghiệp)?",
    type: "radio",
    options: [
      { value: "en", label: "Tiếng Anh nâng cao" },
      { value: "zh", label: "Tiếng Trung" },
      { value: "jp", label: "Tiếng Nhật" },
      { value: "kr", label: "Tiếng Hàn" },
      { value: "none", label: "Chưa ưu tiên" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D6",
    text: "Bạn thích làm việc (A) remote hoàn toàn / (B) tại văn phòng / (C) kết hợp?",
    type: "radio",
    options: [
      { value: "remote", label: "A - Remote" },
      { value: "onsite", label: "B - Văn phòng" },
      { value: "hybrid", label: "C - Hybrid" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D7",
    text: "Mức độ hứng thú làm việc trong môi trường startup (nhịp nhanh, đa nhiệm)?",
    type: "radio",
    options: [
      { value: "low", label: "Thấp" },
      { value: "medium", label: "Trung bình" },
      { value: "high", label: "Cao" },
    ],
    group: "D",
    required: true,
  },
  {
    code: "D8",
    text: "Sản phẩm bạn muốn xây dựng hướng tới đối tượng nào?",
    type: "radio",
    options: [
      { value: "b2c", label: "Người dùng cá nhân (B2C)" },
      { value: "b2b", label: "Doanh nghiệp (B2B)" },
      { value: "internal", label: "Nội bộ / công cụ nội bộ" },
      { value: "research", label: "Nghiên cứu / học thuật" },
    ],
    group: "D",
    required: true,
  },
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  ...MBTI_CORE,
  ...MBTI_EXTRA,
  ...GROUP_A,
  ...GROUP_B,
  ...GROUP_C,
  ...GROUP_D,
];

export const ASSESSMENT_QUESTION_CODES = ASSESSMENT_QUESTIONS.map((q) => q.code);

export const ASSESSMENT_QUESTIONS_BY_GROUP = {
  MBTI: [...MBTI_CORE, ...MBTI_EXTRA],
  A: GROUP_A,
  B: GROUP_B,
  C: GROUP_C,
  D: GROUP_D,
} as const;
