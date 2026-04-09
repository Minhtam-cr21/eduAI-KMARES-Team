import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Answer = { code: string; answer: string };

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { userId?: string; answers?: Answer[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const answers = body.answers ?? [];
  const answerMap = new Map<string, string>();
  for (const a of answers) answerMap.set(a.code, a.answer);

  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const mbtiMapping: Array<{
    code: string;
    map: Record<string, keyof typeof scores>;
  }> = [
    { code: "MBTI_1", map: { E: "E", I: "I" } },
    { code: "MBTI_2", map: { E: "E", I: "I" } },
    { code: "MBTI_3", map: { S: "S", N: "N" } },
    { code: "MBTI_4", map: { S: "S", N: "N" } },
    { code: "MBTI_5", map: { T: "T", F: "F" } },
    { code: "MBTI_6", map: { T: "T", F: "F" } },
    { code: "MBTI_7", map: { J: "J", P: "P" } },
    { code: "MBTI_8", map: { J: "J", P: "P" } },
    { code: "MBTI_9", map: { J: "J", P: "P" } },
    { code: "MBTI_10", map: { J: "J", P: "P" } },
  ];

  for (const m of mbtiMapping) {
    const ans = answerMap.get(m.code);
    if (ans && m.map[ans]) {
      const k = m.map[ans];
      scores[k]++;
    }
  }

  const mbti_type =
    `${scores.E >= scores.I ? "E" : "I"}` +
    `${scores.S >= scores.N ? "S" : "N"}` +
    `${scores.T >= scores.F ? "T" : "F"}` +
    `${scores.J >= scores.P ? "J" : "P"}`;

  const hours = answerMap.get("A3");
  let preferred_pace: "slow" | "medium" | "fast" = "medium";
  if (hours === "<1") preferred_pace = "slow";
  else if (hours === ">4") preferred_pace = "fast";

  const challengeInput = answerMap.get("B4");
  let challenge_level: "easy" | "medium" | "hard" = "medium";
  if (challengeInput === "easy") challenge_level = "easy";
  else if (challengeInput === "very_hard" || challengeInput === "challenge") {
    challenge_level = "hard";
  }

  const reminder = answerMap.get("B6");
  let reminder_method: "email" | "telegram" | "none" | "in-app" = "none";
  if (reminder === "email") reminder_method = "email";
  else if (reminder === "telegram") reminder_method = "telegram";
  else if (reminder === "inapp" || reminder === "in-app") {
    reminder_method = "in-app";
  }

  const goal = answerMap.get("A1") ?? null;
  const interest = answerMap.get("D1");
  const suggestedCategories = new Set<string>();

  if (goal === "web" || interest === "website") {
    suggestedCategories.add("Frontend");
    suggestedCategories.add("Backend");
    suggestedCategories.add("Fullstack");
  }
  if (goal === "data" || interest === "data") {
    suggestedCategories.add("SQL");
    suggestedCategories.add("Python");
  }
  if (goal === "game" || interest === "game") {
    suggestedCategories.add("C++");
  }
  if (goal === "mobile") {
    suggestedCategories.add("Java");
    suggestedCategories.add("C++");
  }
  if (goal === "automation") {
    suggestedCategories.add("Python");
    suggestedCategories.add("C++");
  }
  if (interest === "automation") {
    suggestedCategories.add("Python");
  }

  if (suggestedCategories.size === 0) {
    suggestedCategories.add("Frontend");
    suggestedCategories.add("SQL");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cats = Array.from(suggestedCategories);
  const { data: courses } = await supabase
    .from("courses")
    .select("id, category")
    .in("category", cats)
    .eq("status", "published")
    .limit(12);

  const suggested_course_ids = Array.from(
    new Set((courses ?? []).map((c) => c.id as string))
  ).slice(0, 6);

  const hours_per_day =
    hours === "<1"
      ? 1
      : hours === "1-2"
        ? 2
        : hours === "2-4"
          ? 3
          : hours === ">4"
            ? 5
            : 2;

  return new Response(
    JSON.stringify({
      goal,
      hours_per_day,
      learning_style: answerMap.get("B1") ?? null,
      mbti_type,
      preferred_pace,
      challenge_level,
      reminder_method,
      suggested_course_ids,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
