const RESEND_API = "https://api.resend.com/emails";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "EduAI <onboarding@resend.dev>"
  );
}

async function sendResend(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing, skip send:", payload.subject);
    return;
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[email] Resend error:", res.status, t.slice(0, 300));
  }
}

export async function sendMissedDeadlineNotification(
  studentEmail: string,
  lessonTitle: string,
  newDueDate: string
): Promise<void> {
  await sendResend({
    to: studentEmail,
    subject: "[EduAI] Bạn đã trượt deadline bài học — đã dời lịch",
    html: `<p>Xin chào,</p>
<p>Bài <strong>${escapeHtml(lessonTitle)}</strong> đã quá hạn. Hệ thống đã tự động dời hạn nộp sang <strong>${escapeHtml(newDueDate)}</strong>.</p>
<p>Vui lòng vào lịch học trên EduAI để tiếp tục.</p>`,
  });
}

export type ConnectionUpdateAction =
  | "accepted"
  | "rejected"
  | "link_updated"
  | "deleted";

/** Thông báo học sinh khi GV thay đổi kết nối (Resend; không key thì chỉ log). */
export async function sendConnectionUpdateEmail(
  studentEmail: string,
  opts: {
    teacherName: string;
    action: ConnectionUpdateAction;
    teacherResponse?: string | null;
  }
): Promise<void> {
  const verb: Record<ConnectionUpdateAction, string> = {
    accepted: "đã chấp nhận yêu cầu kết nối của bạn",
    rejected: "đã từ chối yêu cầu kết nối của bạn",
    link_updated: "đã cập nhật link liên hệ trong yêu cầu kết nối của bạn",
    deleted: "đã xóa yêu cầu kết nối của bạn",
  };

  const subjectMap: Record<ConnectionUpdateAction, string> = {
    accepted: "[EduAI] Giáo viên đã chấp nhận kết nối",
    rejected: "[EduAI] Giáo viên đã từ chối kết nối",
    link_updated: "[EduAI] Cập nhật link kết nối giáo viên",
    deleted: "[EduAI] Yêu cầu kết nối đã bị xóa",
  };

  const resp = opts.teacherResponse?.trim();
  const linkBlock =
    resp && /^https?:\/\//i.test(resp)
      ? `<p>Link liên hệ: <a href="${escapeHtml(resp)}">${escapeHtml(resp)}</a></p>`
      : resp
        ? `<p>Nội dung: ${escapeHtml(resp)}</p>`
        : "";

  await sendResend({
    to: studentEmail,
    subject: subjectMap[opts.action],
    html: `<p>Xin chào,</p>
<p><strong>${escapeHtml(opts.teacherName)}</strong> ${verb[opts.action]}.</p>
${linkBlock}
<p>Vào mục <strong>Kết nối giáo viên</strong> trên EduAI để xem chi tiết.</p>`,
  });
}

export async function sendTeacherConnectionResponseEmail(
  studentEmail: string,
  opts: {
    teacherName: string;
    status: "accepted" | "rejected";
    teacherResponse: string | null;
  }
): Promise<void> {
  await sendConnectionUpdateEmail(studentEmail, {
    teacherName: opts.teacherName,
    action: opts.status === "accepted" ? "accepted" : "rejected",
    teacherResponse: opts.teacherResponse,
  });
}

export async function sendFrozenNotification(
  teacherEmail: string,
  studentName: string
): Promise<void> {
  await sendResend({
    to: teacherEmail,
    subject: "[EduAI] Học sinh không hoạt động — lịch học đã đóng băng",
    html: `<p>Xin chào,</p>
<p>Học sinh <strong>${escapeHtml(studentName)}</strong> không có hoạt động học tập trong hơn 3 ngày. Các mục lịch chưa hoàn thành đã chuyển sang trạng thái <strong>đóng băng</strong>.</p>
<p>Vui lòng kiểm tra khu vực lộ trình cá nhân hóa.</p>`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
