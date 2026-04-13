/**
 * Chạy hằng ngày (Supabase Dashboard → Edge Functions → Schedules, hoặc cron gọi POST).
 * Biến môi trường: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (tuỳ chọn), RESEND_FROM_EMAIL.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function addOneDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function sendResend(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) {
    console.warn("[handle-missed-deadlines] RESEND_API_KEY missing");
    return;
  }
  const from =
    Deno.env.get("RESEND_FROM_EMAIL")?.trim() || "EduAI <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("[handle-missed-deadlines] Resend", await res.text());
  }
}

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = todayUtc();

  const { data: missedRows, error: missErr } = await supabase
    .from("study_schedule")
    .select("id, user_id, lesson_id, due_date, miss_count, status")
    .eq("status", "pending")
    .lt("due_date", today);

  if (missErr) {
    return new Response(JSON.stringify({ error: missErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let slipped = 0;
  for (const row of missedRows ?? []) {
    const newDue = addOneDay(String(row.due_date));
    const nextMiss = (row.miss_count ?? 0) + 1;

    const { error: upErr } = await supabase
      .from("study_schedule")
      .update({
        due_date: newDue,
        miss_count: nextMiss,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (upErr) {
      console.error("[slip]", row.id, upErr.message);
      continue;
    }
    slipped++;

    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("title")
      .eq("id", row.lesson_id)
      .maybeSingle();

    const { data: userData } = await supabase.auth.admin.getUserById(
      row.user_id as string
    );
    const email = userData.user?.email;
    if (email) {
      await sendResend(
        email,
        "[EduAI] Deadline bài học đã được dời",
        `<p>Bài <strong>${(lesson?.title as string) ?? "học tập"}</strong> đã quá hạn. Hạn mới: <strong>${newDue}</strong>.</p>`
      );
    }
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
  const cutoff = threeDaysAgo.toISOString();

  const { data: staleStudents, error: stErr } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student")
    .not("last_activity_at", "is", null)
    .lt("last_activity_at", cutoff);

  if (stErr) {
    return new Response(JSON.stringify({ error: stErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let frozen = 0;
  const emailedTeachers = new Set<string>();

  for (const st of staleStudents ?? []) {
    const sid = st.id as string;

    const { data: activePath } = await supabase
      .from("personalized_paths")
      .select("id, teacher_id")
      .eq("student_id", sid)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activePath?.id) continue;

    const { data: pending, error: pErr } = await supabase
      .from("study_schedule")
      .select("id")
      .eq("user_id", sid)
      .eq("path_id", activePath.id)
      .eq("status", "pending");

    if (pErr || !pending?.length) continue;

    const ids = pending.map((r) => r.id);
    const { error: frErr } = await supabase
      .from("study_schedule")
      .update({
        status: "frozen",
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (frErr) {
      console.error("[freeze]", sid, frErr.message);
      continue;
    }
    frozen += ids.length;

    const tid = activePath.teacher_id as string | null;
    if (tid && !emailedTeachers.has(tid)) {
      emailedTeachers.add(tid);
      const { data: tUser } = await supabase.auth.admin.getUserById(tid);
      const tEmail = tUser.user?.email;
      if (tEmail) {
        await sendResend(
          tEmail,
          "[EduAI] Học sinh không hoạt động — lịch đóng băng",
          `<p>Học sinh <strong>${(st.full_name as string) ?? sid}</strong> không có hoạt động trên 3 ngày. Các mục lịch pending đã chuyển sang <strong>đóng băng</strong>.</p>`
        );
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      today,
      slipped,
      frozenScheduleRows: frozen,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
