/**
 * Chia văn bản thành các đoạn ~500 token (ước lượng ~4 ký tự/token),
 * overlap ~50 token để giữ ngữ cảnh biên.
 */
export function chunkText(
  text: string,
  maxChars = 2000,
  overlapChars = 200
): string[] {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  if (overlapChars >= maxChars) {
    overlapChars = Math.floor(maxChars / 5);
  }

  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(i + maxChars, t.length);
    let slice = t.slice(i, end);
    if (end < t.length) {
      const breakAt = slice.lastIndexOf("\n\n");
      if (breakAt > maxChars * 0.45) {
        slice = slice.slice(0, breakAt);
      }
    }
    const trimmed = slice.trim();
    if (trimmed.length > 0) out.push(trimmed);
    if (end >= t.length) break;
    const step = Math.max(trimmed.length - overlapChars, 1);
    i += step;
  }
  return out;
}
