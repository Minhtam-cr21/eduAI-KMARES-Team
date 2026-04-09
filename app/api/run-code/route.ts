import { createClient } from "@/lib/supabase/server";
import {
  JUDGE0_SUBMISSIONS_URL,
  mapLanguageToJudge0Id,
} from "@/lib/judge0/languages";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

console.log(
  "x-rapidapi-key from env:",
  process.env["x-rapidapi-key"] ? "exists" : "missing"
);

const bodySchema = z.object({
  code: z.string(),
  language: z.enum(["python", "javascript", "cpp", "java"]),
  stdin: z.string().optional().default(""),
});

type Judge0SubmissionResponse = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  exit_code?: number | null;
  exit_signal?: string | null;
  status?: { id?: number; description?: string };
};

function normalizeExitCode(j: Judge0SubmissionResponse): number {
  if (typeof j.exit_code === "number") return j.exit_code;
  const id = j.status?.id;
  if (id === 3) return 0;
  return -1;
}

function toBase64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64");
}

function fromBase64(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return Buffer.from(s, "base64").toString("utf-8");
  } catch {
    return s;
  }
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const PISTON_LANG_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  cpp: { language: "c++", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
};

type PistonResponse = {
  run?: { stdout?: string; stderr?: string; code?: number; signal?: string | null };
  compile?: { stdout?: string; stderr?: string; code?: number };
  message?: string;
};

async function runWithPiston(
  code: string,
  language: string,
  stdin: string
): Promise<{
  output: string;
  error: string;
  exit_code: number;
}> {
  const mapping = PISTON_LANG_MAP[language];
  if (!mapping) {
    throw new Error(`Piston: ngôn ngữ "${language}" không hỗ trợ`);
  }

  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: mapping.language,
      version: mapping.version,
      files: [{ content: code }],
      stdin: stdin || "",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Piston HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = JSON.parse(text) as PistonResponse;
  if (data.message) {
    throw new Error(`Piston: ${data.message}`);
  }

  const compileErr = data.compile?.stderr?.trim() ?? "";
  const runOut = data.run?.stdout?.trim() ?? "";
  const runErr = data.run?.stderr?.trim() ?? "";
  const exitCode =
    typeof data.run?.code === "number" ? data.run.code : -1;
  const errorCombined = [compileErr, runErr].filter(Boolean).join("\n");

  return {
    output: runOut,
    error: errorCombined,
    exit_code: exitCode,
  };
}

export async function POST(request: Request) {
  const rawKey = process.env["x-rapidapi-key"];
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { code, language, stdin } = parsed.data;
  const languageId = mapLanguageToJudge0Id(language);

  let result: { output: string; error: string; exit_code: number } | null =
    null;

  // --- Judge0 CE (ưu tiên nếu có key) ---
  if (apiKey) {
    try {
      const requestBody = {
        source_code: toBase64(code),
        language_id: languageId,
        stdin: toBase64(stdin),
      };

      console.log("[run-code] Judge0 request:", {
        language,
        language_id: languageId,
        codeLength: code.length,
        stdinLength: stdin.length,
      });

      const judgeRes = await fetch(JUDGE0_SUBMISSIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await judgeRes.text();
      let raw: Judge0SubmissionResponse & { error?: string };
      try {
        raw = responseText
          ? (JSON.parse(responseText) as typeof raw)
          : ({} as typeof raw);
      } catch (parseErr) {
        const detail =
          parseErr instanceof Error ? parseErr.message : "Invalid JSON";
        console.error("[run-code] Judge0 response not JSON:", {
          status: judgeRes.status,
          bodyPreview: responseText.slice(0, 500),
          detail,
        });
        throw new Error(`Judge0 non-JSON ${judgeRes.status}`);
      }

      console.log("[run-code] Judge0 response:", {
        status: judgeRes.status,
        ok: judgeRes.ok,
        statusDesc: raw.status?.description,
      });

      if (!judgeRes.ok) {
        const msg =
          typeof raw.error === "string"
            ? raw.error
            : `Judge0 HTTP ${judgeRes.status}`;
        throw new Error(msg);
      }

      const out = fromBase64(raw.stdout as string | null).trim();
      const errParts = [
        fromBase64(raw.stderr as string | null).trim(),
        fromBase64(raw.compile_output as string | null).trim(),
      ].filter(Boolean);
      const errCombined = errParts.join("\n").trim();
      const extraMsg = asText(raw.message).trim();
      const errorCombined = [errCombined, extraMsg].filter(Boolean).join("\n");

      result = {
        output: out,
        error: errorCombined,
        exit_code: normalizeExitCode(raw),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[run-code] Judge0 failed, trying Piston fallback:", msg);
    }
  } else {
    console.warn(
      "[run-code] x-rapidapi-key missing, skipping Judge0 → Piston"
    );
  }

  // --- Piston fallback ---
  if (!result) {
    try {
      console.log("[run-code] Piston fallback:", { language });
      result = await runWithPiston(code, language, stdin);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[run-code] Piston also failed:", msg);
      return NextResponse.json(
        {
          output: "",
          error: `Lỗi chạy code: cả Judge0 và Piston đều thất bại. Chi tiết: ${msg}`,
          exit_code: -1,
        },
        { status: 200 }
      );
    }
  }

  // --- Lưu DB + trả kết quả ---
  const { error: insertErr } = await supabase.from("code_submissions").insert({
    user_id: user.id,
    code,
    language,
    output: result.output || null,
    error: result.error || null,
  });

  if (insertErr) {
    console.error("[run-code] insert code_submissions:", insertErr.message);
  }

  return NextResponse.json({
    output: result.output ?? "",
    error: result.error ?? "",
    exit_code: result.exit_code,
  });
}
