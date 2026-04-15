import { randomBytes, randomUUID } from "node:crypto";

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

export function jitsiRoomUrl(roomId: string): string {
  const id = roomId.trim();
  if (!id) return "";
  return `https://meet.jit.si/${encodeURIComponent(`EduAI-${id}`)}`;
}

/**
 * Auto Jitsi room: persist `teacher_response` = roomId (UUID),
 * `meeting_link` = full URL for email / iframe.
 */
export function createJitsiMeeting(): {
  roomId: string;
  meeting_code: null;
  meeting_link: string;
} {
  const roomId = randomUUID();
  return {
    roomId,
    meeting_code: null,
    meeting_link: jitsiRoomUrl(roomId),
  };
}

/** Build Jitsi URL from teacher-entered class code (alphanumeric only). */
export function jitsiLinkFromClassCode(raw: string): string | null {
  const safe = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48);
  if (!safe) return null;
  return `https://meet.jit.si/EduAI-${safe}`;
}
