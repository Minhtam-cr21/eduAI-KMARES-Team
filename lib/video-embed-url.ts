/**
 * Chuẩn hoá URL video để nhúng iframe (YouTube watch/short → embed).
 * URL không nhận diện được thì trả về nguyên bản nếu bắt đầu bằng http(s).
 */
export function normalizeVideoEmbedUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  if (url.includes("youtube.com/embed/")) return url;

  const watch = /[?&]v=([^&]+)/.exec(url);
  if (watch?.[1] && url.includes("youtube.com")) {
    return `https://www.youtube.com/embed/${watch[1]}`;
  }

  const short = /youtu\.be\/([^/?]+)/.exec(url);
  if (short?.[1]) {
    return `https://www.youtube.com/embed/${short[1]}`;
  }

  return url;
}
