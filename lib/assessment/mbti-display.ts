/** Màu badge + mô tả ngắn cho hiển thị kết quả (rule-based). */

export const MBTI_BADGE_CLASS: Record<string, string> = {
  INTJ: "bg-violet-600/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  INTP: "bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  ENTJ: "bg-red-600/15 text-red-700 dark:text-red-300 border-red-500/30",
  ENTP: "bg-orange-600/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  INFJ: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  INFP: "bg-green-600/15 text-green-700 dark:text-green-300 border-green-500/30",
  ENFJ: "bg-teal-600/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  ENFP: "bg-amber-600/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  ISTJ: "bg-slate-600/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  ISFJ: "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  ESTJ: "bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  ESFJ: "bg-pink-600/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
  ISTP: "bg-zinc-600/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
  ISFP: "bg-rose-600/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  ESTP: "bg-yellow-600/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/30",
  ESFP: "bg-fuchsia-600/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
};

export const MBTI_SHORT_BLURB: Record<string, string> = {
  INTJ: "Chiến lược, độc lập, thích hệ thống và cải tiến dài hạn.",
  INTP: "Phân tích, tò mò lý thuyết, giải quyết bài toán trừu tượng.",
  ENTJ: "Lãnh đạo quyết đoán, định hướng mục tiêu và hiệu quả.",
  ENTP: "Sáng tạo, tranh luận lành mạnh, thích thử ý tưởng mới.",
  INFJ: "Thấu hiểu người khác, giá trị sâu sắc, định hướng ý nghĩa.",
  INFP: "Chân thành, giàu cảm xúc, theo đuổi sự phù hợp với giá trị cá nhân.",
  ENFJ: "Truyền cảm hứng, hỗ trợ cộng đồng, phối hợp nhóm tốt.",
  ENFP: "Nhiệt huyết, đa khả năng, kết nối ý tưởng và con người.",
  ISTJ: "Đáng tin cậy, có tổ chức, chú trọng chi tiết và trách nhiệm.",
  ISFJ: "Tận tâm, ổn định, quan tâm nhu cầu thực tế của người khác.",
  ESTJ: "Kỷ luật, rõ ràng, đảm bảo tiến độ và quy trình.",
  ESFJ: "Hòa đồng, chu đáo, duy trì không khí tích cực trong nhóm.",
  ISTP: "Thực dụng, linh hoạt, giỏi xử lý công cụ và kỹ thuật.",
  ISFP: "Nhẹ nhàng, thẩm mỹ, thích trải nghiệm và sự chân thật.",
  ESTP: "Nhanh nhạy, thích hành động, xử lý tốt tình huống hiện tại.",
  ESFP: "Vui vẻ, cởi mở, mang năng lượng tích cực cho môi trường.",
};

export function mbtiBadgeClass(type: string | null | undefined): string {
  if (!type) return "bg-muted text-muted-foreground border-border";
  return (
    MBTI_BADGE_CLASS[type.toUpperCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

export function mbtiBlurb(type: string | null | undefined): string {
  if (!type) return "Kết quả MBTI ước lượng từ bài test của bạn.";
  return (
    MBTI_SHORT_BLURB[type.toUpperCase()] ??
    "Nhóm tính cách đa dạng — kết hợp với điểm mạnh cá nhân để chọn hướng phù hợp."
  );
}
