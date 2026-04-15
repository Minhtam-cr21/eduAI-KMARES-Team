import { randomBytes } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short class code (no I, O, 0, 1). */
export function generateClassCode(length = 6): string {
  const buf = randomBytes(length);
  let s = "";
  for (let i = 0; i < length; i++) {
    s += CODE_ALPHABET[buf[i]! % CODE_ALPHABET.length];
  }
  return s;
}

/** Random Jitsi room URL + display code. */
export function createJitsiMeeting(): { meeting_code: string; meeting_link: string } {
  const meeting_code = generateClassCode(6);
  const entropy = randomBytes(5).toString("hex");
  const room = `EduAI-${meeting_code}-${entropy}`;
  return {
    meeting_code,
    meeting_link: `https://meet.jit.si/${encodeURIComponent(room)}`,
  };
}

/** Build Jitsi URL from teacher-entered class code (alphanumeric only). */
export function jitsiLinkFromClassCode(raw: string): string | null {
  const safe = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48);
  if (!safe) return null;
  return `https://meet.jit.si/EduAI-${safe}`;
}
