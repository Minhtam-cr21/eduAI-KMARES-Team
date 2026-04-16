/**
 * Chạy hằng ngày: GitHub Actions (.github/workflows/supabase-handle-missed-deadlines.yml),
 * hoặc Supabase Dashboard → Cron / Schedules, hoặc cron ngoài POST tới …/functions/v1/handle-missed-deadlines.
 *
 * Secrets (Dashboard → Edge Functions → Secrets hoặc `npm run supabase:deploy:deadlines`):
 *   SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL (tuỳ chọn).
 * Supabase tự inject: SUPABASE_URL, SUPABASE_ANON_KEY.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SchedulePriority = "critical" | "high" | "normal" | "light";
type SoftDeadlineLevel = "level_1" | "level_2" | "level_3" | "level_4";

type LearnerContext = {
  recommendedPacing: "slow" | "steady" | "accelerated" | null;
  riskFlagCount: number;
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysLate(dueDate: string, today: string): number {
  const start = new Date(`${dueDate}T00:00:00.000Z`);
  const end = new Date(`${today}T00:00:00.000Z`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function priorityFromScore(score: number): SchedulePriority {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "normal";
  return "light";
}

function computePriority(args: {
  dueDate: string;
  today: string;
  missCount: number;
  learner: LearnerContext;
}): SchedulePriority {
  let score = 45;
  score += Math.min(30, args.missCount * 12);
  score += Math.min(15, daysLate(args.dueDate, args.today) * 5);
  if (args.learner.recommendedPacing === "slow") score += 8;
  if (args.learner.riskFlagCount >= 2) score += 8;
  return priorityFromScore(score);
}

function decideSoftDeadlineLevel(args: {
  nextMiss: number;
  learner: LearnerContext;
}): SoftDeadlineLevel {
  const learnerHighRisk =
    args.learner.recommendedPacing === "slow" || args.learner.riskFlagCount >= 2;

  if (args.nextMiss <= 1) return "level_1";
  if (args.nextMiss === 2 && !learnerHighRisk) return "level_2";
  if (args.nextMiss === 2 && learnerHighRisk) return "level_3";
  if (args.nextMiss === 3 && !learnerHighRisk) return "level_3";
  return "level_4";
}

function levelShiftDays(
  level: SoftDeadlineLevel,
  learner: LearnerContext
): number {
  if (level === "level_1") return 1;
  if (level === "level_2") return learner.recommendedPacing === "slow" ? 3 : 2;
  if (level === "level_3") {
    return learner.recommendedPacing === "slow" || learner.riskFlagCount >= 2 ? 5 : 4;
  }
  return 0;
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
    .select("id, user_id, lesson_id, due_date, miss_count, status, path_id")
    .eq("status", "pending")
    .lt("due_date", today);

  if (missErr) {
    return new Response(JSON.stringify({ error: missErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userIds = Array.from(
    new Set((missedRows ?? []).map((row) => String(row.user_id)))
  );
  const learnerContextByUser = new Map<string, LearnerContext>();
  if (userIds.length > 0) {
    const { data: analyses } = await supabase
      .from("career_orientations")
      .select("user_id, learner_profile, ai_analysis, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    for (const row of analyses ?? []) {
      const userId = String(row.user_id);
      if (learnerContextByUser.has(userId)) continue;
      const learnerProfile =
        row.learner_profile && typeof row.learner_profile === "object"
          ? (row.learner_profile as Record<string, unknown>)
          : null;
      const aiAnalysis =
        row.ai_analysis && typeof row.ai_analysis === "object"
          ? (row.ai_analysis as Record<string, unknown>)
          : null;

      learnerContextByUser.set(userId, {
        recommendedPacing:
          aiAnalysis?.recommended_pacing === "slow" ||
          aiAnalysis?.recommended_pacing === "steady" ||
          aiAnalysis?.recommended_pacing === "accelerated"
            ? (aiAnalysis.recommended_pacing as LearnerContext["recommendedPacing"])
            : null,
        riskFlagCount: Array.isArray(learnerProfile?.risk_flags)
          ? learnerProfile.risk_flags.length
          : 0,
      });
    }
  }

  let slipped = 0;
  let level1 = 0;
  let level2 = 0;
  let level3 = 0;
  let level4 = 0;
  const frozenByPolicyPaths = new Set<string>();
  const emailedTeachers = new Set<string>();

  for (const row of missedRows ?? []) {
    const nextMiss = (row.miss_count ?? 0) + 1;
    const learner =
      learnerContextByUser.get(String(row.user_id)) ?? {
        recommendedPacing: null,
        riskFlagCount: 0,
      };
    const priorityBefore = computePriority({
      dueDate: String(row.due_date),
      today,
      missCount: Math.max(0, row.miss_count ?? 0),
      learner,
    });
    const priorityAfter = computePriority({
      dueDate: String(row.due_date),
      today,
      missCount: nextMiss,
      learner,
    });
    const level = decideSoftDeadlineLevel({
      nextMiss,
      learner,
    });

    if (level === "level_1") level1++;
    if (level === "level_2") level2++;
    if (level === "level_3") level3++;
    if (level === "level_4") level4++;

    const pathId = row.path_id ? String(row.path_id) : null;
    const shiftDays = levelShiftDays(level, learner);
    const newDue =
      level === "level_4" ? null : addDays(String(row.due_date), shiftDays);

    if (level !== "level_4") {
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

      if (level === "level_3" && pathId) {
        const { data: followingRows } = await supabase
          .from("study_schedule")
          .select("id, due_date")
          .eq("user_id", row.user_id)
          .eq("path_id", pathId)
          .eq("status", "pending")
          .gte("due_date", today)
          .neq("id", row.id)
          .order("due_date", { ascending: true })
          .limit(2);

        for (const nextRow of followingRows ?? []) {
          if (!nextRow.due_date) continue;
          const { error: rebalanceErr } = await supabase
            .from("study_schedule")
            .update({
              due_date: addDays(String(nextRow.due_date), 1),
              updated_at: new Date().toISOString(),
            })
            .eq("id", nextRow.id);
          if (rebalanceErr) {
            console.error("[rebalance]", nextRow.id, rebalanceErr.message);
          }
        }
      }
    } else if (pathId && !frozenByPolicyPaths.has(pathId)) {
      frozenByPolicyPaths.add(pathId);
      const frozenUntil = addDays(today, 7);
      const { data: pendingRows, error: pendingErr } = await supabase
        .from("study_schedule")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("path_id", pathId)
        .eq("status", "pending");

      if (pendingErr) {
        console.error("[policy-freeze-fetch]", pathId, pendingErr.message);
        continue;
      }

      const ids = (pendingRows ?? []).map((item) => item.id);
      if (ids.length > 0) {
        const { error: freezeErr } = await supabase
          .from("study_schedule")
          .update({
            status: "frozen",
            frozen_until: frozenUntil,
            updated_at: new Date().toISOString(),
          })
          .in("id", ids);
        if (freezeErr) {
          console.error("[policy-freeze-update]", pathId, freezeErr.message);
          continue;
        }
      }

      if (pathId) {
        const { data: activePath } = await supabase
          .from("personalized_paths")
          .select("teacher_id")
          .eq("id", pathId)
          .maybeSingle();
        const tid = activePath?.teacher_id ? String(activePath.teacher_id) : null;
        if (tid && !emailedTeachers.has(tid)) {
          emailedTeachers.add(tid);
          const { data: tUser } = await supabase.auth.admin.getUserById(tid);
          const tEmail = tUser.user?.email;
          if (tEmail) {
            await sendResend(
              tEmail,
              "[EduAI] Smart Schedule V2 cần teacher review",
              `<p>Study schedule của học sinh đã chạm mức <strong>level 4</strong> và được freeze có kiểm soát đến <strong>${frozenUntil}</strong>. Vui lòng review lại pacing/priority.</p>`
            );
          }
        }
      }
    }

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
        level === "level_4"
          ? `<p>Bài <strong>${(lesson?.title as string) ?? "học tập"}</strong> đã chạm ngưỡng hỗ trợ cao. Lịch được <strong>freeze có kiểm soát</strong> để teacher review.</p>`
          : `<p>Bài <strong>${(lesson?.title as string) ?? "học tập"}</strong> đã quá hạn. Hạn mới: <strong>${newDue}</strong>. Smart Schedule V2 áp dụng <strong>${level}</strong>.</p>`
      );
    }

    const { error: logErr } = await supabase.from("schedule_adjustment_logs").insert({
      user_id: row.user_id,
      schedule_item_id: row.id,
      teacher_id: null,
      path_id: pathId,
      adjustment_source: "system_policy",
      adjustment_level: level,
      priority_before: priorityBefore,
      priority_after: priorityAfter,
      pacing_override: learner.recommendedPacing,
      decision_note:
        level === "level_4"
          ? "Freeze có kiểm soát + teacher review."
          : `Tự động dời hạn theo ${level}.`,
      snapshot: {
        previous_due_date: row.due_date,
        proposed_due_date: newDue,
        next_miss_count: nextMiss,
        learner_risk_flag_count: learner.riskFlagCount,
        learner_recommended_pacing: learner.recommendedPacing,
      },
    });
    if (logErr) {
      console.error("[schedule-adjustment-log]", row.id, logErr.message);
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
      policyLevels: {
        level_1: level1,
        level_2: level2,
        level_3: level3,
        level_4: level4,
      },
      frozenScheduleRows: frozen,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
